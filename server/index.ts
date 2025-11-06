// Use proper ES module import for Express and pg
// FIX: Aliased Request and Response to avoid conflicts with global types (e.g. from DOM).
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Changed import to be compatible with the CommonJS 'pg' module
import pg from 'pg';
const { Pool } = pg;

// --- Environment Variable Validation ---
// This is a critical check to ensure the service doesn't crash silently.
const requiredEnvVars = ['API_KEY', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FATAL ERROR: Environment variable ${envVar} is not set.`);
        process.exit(1); // Exit gracefully if a variable is missing
    }
}

// Types copied from ../types.ts to avoid bringing in React/DOM definitions
export interface ExpenseItem {
  name: string;
  amount: number;
}
export interface FinancialHealthScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  strengths: string[];
  weaknesses: string[];
}
export interface ClientProfile {
  industry: string;
  businessModel: 'B2B' | 'B2C' | 'D2C' | 'Hybrid';
  primaryGoal: 'Aggressive Growth' | 'Maximize Profitability' | 'Maintain Stability';
}
export interface ParsedFinancialData {
  period: string;
  totalRevenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  interestBearingDebt?: number;
  creditCardDebt?: number;
  cashFromOps: number;
  equity: number;
  costOfGoodsSold?: number;
  operatingExpenses?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  cashAndEquivalents?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  topExpenses?: ExpenseItem[];
}
export interface AiAnalysisData {
    summary: string[];
    recommendations: string[];
}


const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// --- Database Connection ---
const connectionName = 'vfin-prod-instance:us-central1:vfin-prod-db';

const dbPool = new Pool({
    user: 'postgres',
    database: 'vfin_data',
    password: process.env.DB_PASSWORD,
    host: `/cloudsql/${connectionName}`,
    port: 5432,
});

// Test DB Connection Endpoint
app.get('/api/db-test', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ message: 'Database connection successful!', time: result.rows[0].now });
    } catch (error: any) {
        console.error("Database connection test failed:", error);
        res.status(500).json({ error: "Failed to connect to the database.", details: error.message });
    }
});


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Schemas for AI responses
const financialDataSchema = {
    type: Type.OBJECT,
    properties: {
        period: { type: Type.STRING, description: 'The financial period, e.g., "September 2025" or "Year 2023"' },
        totalRevenue: { type: Type.NUMBER, description: 'Total revenue or sales.' },
        netIncome: { type: Type.NUMBER, description: 'Net income or net profit/loss.' },
        totalAssets: { type: Type.NUMBER, description: 'Total assets.' },
        totalLiabilities: { type: Type.NUMBER, description: 'Total liabilities (sum of all liabilities).' },
        interestBearingDebt: { type: Type.NUMBER, description: 'Total interest-bearing debt. This should ONLY include loans, notes payable, and other financing arrangements that accrue interest. Exclude operational liabilities like Accounts Payable or Accrued Expenses.' },
        creditCardDebt: { type: Type.NUMBER, description: 'Total credit card debt. Extract this only if it is explicitly listed as a separate line item. If not listed, omit this field or set to 0.' },
        equity: { type: Type.NUMBER, description: 'Total equity or shareholders\' equity.' },
        cashFromOps: { type: Type.NUMBER, description: 'Net cash flow from operating activities.' },
        costOfGoodsSold: { type: Type.NUMBER, description: 'Cost of Goods Sold (COGS) or cost of revenue.' },
        operatingExpenses: { type: Type.NUMBER, description: 'Total operating expenses.' },
        currentAssets: { type: Type.NUMBER, description: 'Total current assets.' },
        currentLiabilities: { type: Type.NUMBER, description: 'Total current liabilities.' },
        cashAndEquivalents: { type: Type.NUMBER, description: 'Total cash and cash equivalents from the balance sheet.'},
        accountsReceivable: { type: Type.NUMBER, description: 'Accounts Receivable (A/R).'},
        accountsPayable: { type: Type.NUMBER, description: 'Accounts Payable (A/P).'},
        topExpenses: {
            type: Type.ARRAY,
            description: 'A list of the top 5 largest expense categories from the income statement, sorted in descending order of amount. Each item should have a name and an amount.',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'The name of the expense category.' },
                    amount: { type: Type.NUMBER, description: 'The amount of the expense.' }
                },
                required: ['name', 'amount']
            }
        },
    },
    required: ['period', 'totalRevenue', 'netIncome', 'totalAssets', 'totalLiabilities', 'equity', 'cashFromOps']
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.ARRAY,
            description: "A brief, 1-2 sentence summary of the overall financial health, written in a professional and encouraging tone.",
            items: { type: Type.STRING }
        },
        recommendations: {
            type: Type.ARRAY,
            description: "A list of 2-3 concise, actionable recommendations for the business owner. Each recommendation should be a separate string.",
            items: { type: Type.STRING }
        }
    },
    required: ['summary', 'recommendations']
};

const healthScoreSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.NUMBER, description: "An overall financial health score from 0 to 100." },
        rating: { 
            type: Type.STRING, 
            description: "A rating based on the score.",
            enum: ['Excellent', 'Good', 'Fair', 'Poor']
        },
        strengths: {
            type: Type.ARRAY,
            description: "A list of 2-3 key financial strengths.",
            items: { type: Type.STRING }
        },
        weaknesses: {
            type: Type.ARRAY,
            description: "A list of 2-3 key financial weaknesses or areas for improvement.",
            items: { type: Type.STRING }
        }
    },
    required: ['score', 'rating', 'strengths', 'weaknesses']
};

// API Endpoint to parse statements
app.post('/api/parse', async (req: ExpressRequest, res: ExpressResponse) => {
    const { statements } = req.body;
    if (!statements || !statements.balanceSheet || !statements.incomeStatement || !statements.cashFlow) {
        return res.status(400).json({ error: 'Missing financial statements data.' });
    }

    const combinedContent = `
      Here are the three core financial statements for a business. Analyze them together to extract the key figures according to the provided JSON schema. It is critical to distinguish between 'totalLiabilities' (all liabilities), 'interestBearingDebt' (only debt that accrues interest, like loans), and 'creditCardDebt' (if listed separately).
  
      --- BALANCE SHEET ---
      ${statements.balanceSheet}
      --- END BALANCE SHEET ---
  
      --- INCOME STATEMENT (PROFIT & LOSS) ---
      ${statements.incomeStatement}
      --- END INCOME STATEMENT ---
  
      --- CASH FLOW STATEMENT ---
      ${statements.cashFlow}
      --- END CASH FLOW STATEMENT ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Parse the following financial statement data. Extract the key figures according to the provided JSON schema. If a value is not present, use a reasonable default like 0. The data is: \n\n${combinedContent}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: financialDataSchema,
            },
        });
        
        const jsonText = (response.text ?? '').trim();
        if (!jsonText) {
            throw new Error('AI response was empty.');
        }
        const parsedData = JSON.parse(jsonText);
        
        if (!parsedData.period || typeof parsedData.totalRevenue === 'undefined') {
            throw new Error('AI response is missing key financial data.');
        }
        
        res.json(parsedData as ParsedFinancialData);
    } catch (error: any) {
        console.error("Error in /api/parse:", error);
        res.status(500).json({ error: "Failed to parse financial data." });
    }
});

// API Endpoint for financial analysis
app.post('/api/analyze', async (req: ExpressRequest, res: ExpressResponse) => {
    const { currentData, previousData, profile } = req.body as { currentData: ParsedFinancialData, previousData: ParsedFinancialData | null, profile: ClientProfile | null };
    if (!currentData) {
        return res.status(400).json({ error: 'Missing current financial data.' });
    }

    const topExpensesList = currentData.topExpenses && currentData.topExpenses.length > 0
        ? currentData.topExpenses.map(e => `- ${e.name}: $${e.amount.toLocaleString()}`).join('\n')
        : 'Not available.';

    let revenueGrowth = 'N/A';
    if (previousData && previousData.totalRevenue > 0) {
        revenueGrowth = (((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) * 100).toFixed(1) + '%';
    }

    let netProfitMargin = 'N/A';
    if (currentData.totalRevenue > 0) {
        netProfitMargin = ((currentData.netIncome / currentData.totalRevenue) * 100).toFixed(1) + '%';
    }
    
    const debtForAnalysis = currentData.interestBearingDebt ?? currentData.totalLiabilities;

    let creditCardDebtInfo = '';
    if (currentData.creditCardDebt && currentData.creditCardDebt > 0) {
        creditCardDebtInfo = `
    - Credit Card Debt: $${currentData.creditCardDebt.toLocaleString()} (This is part of the total interest-bearing debt)`;
    }

    const profileContext = profile 
        ? `The business is in the ${profile.industry} industry, with a ${profile.businessModel} model. Their primary goal is ${profile.primaryGoal}. Tailor your analysis to this context.`
        : '';

    const prompt = `
    Act as a helpful CPA for a small business owner. ${profileContext} Analyze the following financial data for the period ${currentData.period} and provide a concise, easy-to-understand summary and actionable recommendations.
    
    Key Data Snapshot:
    - Total Revenue: $${currentData.totalRevenue.toLocaleString()}
    - Total Expenses: $${((currentData.costOfGoodsSold || 0) + (currentData.operatingExpenses || 0)).toLocaleString()}
    - Net Income: $${currentData.netIncome.toLocaleString()}
    - Operating Cash Flow: $${(currentData.cashFromOps || 0).toLocaleString()}
    - Cash Balance: $${(currentData.cashAndEquivalents || 0).toLocaleString()}
    - Total Debt (Interest-Bearing): $${debtForAnalysis.toLocaleString()}${creditCardDebtInfo}

    Key Performance Indicators:
    - Revenue Growth: ${revenueGrowth} (compared to previous period)
    - Net Profit Margin: ${netProfitMargin}
    
    Top 5 Expenses:
    ${topExpensesList}

    Based on this data, provide a JSON response with a 'summary' and 'recommendations'. Pay special attention to the top expenses, revenue growth, and industry context. If a significant credit card debt balance is present, please include a specific, actionable recommendation for managing this high-interest debt.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            }
        });
        const jsonText = (response.text ?? '').trim();
         if (!jsonText) {
            throw new Error('AI response was empty.');
        }
        res.json(JSON.parse(jsonText) as AiAnalysisData);
    } catch (error: any) {
        console.error("Error in /api/analyze:", error);
        res.status(500).json({
            summary: ["Could not generate AI summary at this time."],
            recommendations: ["Could not generate AI recommendations. Please try again later."]
        });
    }
});

// API Endpoint for health score
app.post('/api/health-score', async (req: ExpressRequest, res: ExpressResponse) => {
    const { currentData, previousData, profile } = req.body as { currentData: ParsedFinancialData, previousData: ParsedFinancialData | null, profile: ClientProfile | null };
    if (!currentData) {
        return res.status(400).json({ error: 'Missing current financial data.' });
    }

    const netProfitMargin = currentData.totalRevenue > 0 ? (currentData.netIncome / currentData.totalRevenue) : 0;
    const debtToEquity = (currentData.interestBearingDebt ?? currentData.totalLiabilities) / (currentData.equity || 1);
    const revenueGrowth = (previousData && previousData.totalRevenue > 0) ? ((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) : 0;
    
    const profileContext = profile 
        ? `The business is in the ${profile.industry} industry, with a ${profile.businessModel} model, and their goal is ${profile.primaryGoal}. Use this context to inform your scoring, especially when evaluating metrics like profit margin and growth, which vary by industry.`
        : '';

    const prompt = `
    Act as an expert CPA analyzing a small business's financial health. ${profileContext} Based on the following key metrics, provide a holistic financial health score.
    
    - Net Profit Margin: ${(netProfitMargin * 100).toFixed(1)}% (Profitability)
    - Debt to Equity Ratio: ${debtToEquity.toFixed(2)} (Leverage/Risk)
    - Revenue Growth Rate: ${(revenueGrowth * 100).toFixed(1)}% (Momentum)
    - Operating Cash Flow: $${(currentData.cashFromOps || 0).toLocaleString()} (Liquidity)
    - Net Income: $${currentData.netIncome.toLocaleString()} (Absolute Profit)

    Scoring Guidelines:
    - Profit Margin: Award up to 35 points. A margin > 20% is excellent for most, but consider the industry context.
    - Debt Management: Award up to 35 points. A D/E ratio < 0.5 is excellent (lower is better). A ratio > 2.0 is risky.
    - Revenue Efficiency & Growth: Award up to 30 points. Positive revenue growth is good. High operating cash flow relative to net income is excellent.

    Based on your expert analysis of these metrics, provide a JSON response with:
    1. "score": A final integer score from 0-100.
    2. "rating": A rating ('Excellent', 'Good', 'Fair', 'Poor').
    3. "strengths": A list of 2-3 key financial strengths.
    4. "weaknesses": A list of 2-3 key financial weaknesses.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: healthScoreSchema,
            }
        });
        const jsonText = (response.text ?? '').trim();
        if (!jsonText) {
            throw new Error('AI response was empty.');
        }
        res.json(JSON.parse(jsonText) as FinancialHealthScore);
    } catch (error: any) {
        console.error("Error in /api/health-score:", error);
        res.status(500).json({
            score: 40,
            rating: "Fair",
            strengths: ["Could not generate AI analysis for strengths."],
            weaknesses: ["Could not generate AI analysis for weaknesses."]
        });
    }
});

// API Endpoint for KPI explanations
app.post('/api/explain-kpi', async (req: ExpressRequest, res: ExpressResponse) => {
    const { kpiName, kpiValue } = req.body;
     if (!kpiName || !kpiValue) {
        return res.status(400).json({ error: 'Missing kpiName or kpiValue.' });
    }

    const prompt = `
    In simple terms for a small business owner, explain what the financial KPI "${kpiName}" means.
    Also, briefly explain what a value of "${kpiValue}" for this KPI might indicate about their business.
    Keep the explanation concise (2-3 sentences).
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        res.json({ explanation: response.text ?? `Could not generate an explanation for ${kpiName}.` });
    } catch (error) {
        console.error("Error in /api/explain-kpi:", error);
        res.status(500).json({ explanation: `Could not generate an explanation for ${kpiName}.` });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// FIX: Add reference to node types to ensure 'process' is correctly typed.
/// <reference types="node" />

// Using CommonJS require statements to align with tsconfig.json module setting ("module": "CommonJS")
// This resolves TypeScript compilation errors related to mismatched module types.
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require("@google/genai");
const { Pool } = require('pg');

// FIX: Use aliased import type to avoid conflict with global Request/Response types.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';


// --- Environment Variable Validation ---
console.log("LOG: Server process started. Validating environment variables...");
const requiredEnvVars = ['API_KEY', 'DB_PASSWORD'];
let hasMissingEnvVars = false;
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`FATAL: Environment variable ${envVar} is not set.`);
        hasMissingEnvVars = true;
    }
}
if (hasMissingEnvVars) {
    console.error("FATAL: Missing one or more required environment variables. The service will exit.");
    // FIX: Use type assertion for process.exit to resolve type error from misconfigured TS environment.
    (process as NodeJS.Process).exit(1);
}
console.log("LOG: All required environment variables are present.");
const PORT = process.env.PORT || 8080;
console.log(`LOG: PORT is set to ${PORT}`);

// --- Initialize Express App ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increase payload limit for file content
console.log("LOG: Express app initialized with CORS and JSON middleware.");

// --- Initialize Gemini AI Client ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
console.log("LOG: GoogleGenAI client initialized.");

// --- Initialize Database Pool ---
console.log("LOG: Configuring database connection pool...");
const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME || 'vfin-prod-instance:us-central1:vfin-prod-db';
const dbPool = new Pool({
    user: 'postgres',
    database: 'vfin_data',
    password: process.env.DB_PASSWORD,
    host: `/cloudsql/${connectionName}`,
    port: 5432,
});
console.log(`LOG: Database connection pool configured for host: /cloudsql/${connectionName}`);

// --- API Endpoints ---

// Health check endpoint
app.get('/', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send('VFIN Backend is running.');
});

// Database test endpoint
app.get('/api/db-test', async (req: ExpressRequest, res: ExpressResponse) => {
    console.log("LOG: Received request for /api/db-test");
    try {
        // FIX: Cast client to 'any' to bypass missing/incorrect types for the 'pg' package.
        const client: any = await dbPool.connect();
        console.log("LOG: Database client connected.");
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log("LOG: Database test query successful.");
        res.json({ message: 'Database connection successful!', time: result.rows[0].now });
    } catch (error: any) {
        console.error("ERROR: Database connection test failed:", error);
        res.status(500).json({ error: "Failed to connect to the database.", details: error.message });
    }
});

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

app.post('/api/parse', async (req: ExpressRequest, res: ExpressResponse) => {
    const { statements } = req.body;
    if (!statements || !statements.balanceSheet || !statements.incomeStatement || !statements.cashFlow) {
        return res.status(400).json({ error: 'Missing financial statements data.' });
    }
    const combinedContent = `Balance Sheet:\n${statements.balanceSheet}\n\nIncome Statement:\n${statements.incomeStatement}\n\nCash Flow:\n${statements.cashFlow}`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Parse the key figures from the following financial data according to the JSON schema. \n\n${combinedContent}`,
            config: { responseMimeType: "application/json", responseSchema: financialDataSchema },
        });
        res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
        console.error("Error in /api/parse:", error);
        res.status(500).json({ error: "Failed to parse financial data." });
    }
});

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

app.post('/api/analyze', async (req: ExpressRequest, res: ExpressResponse) => {
    const { currentData, previousData, profile } = req.body;
    if (!currentData) return res.status(400).json({ error: 'Missing current financial data.' });
    const prompt = `Analyze this financial data for a business. Profile: ${JSON.stringify(profile)}. Current: ${JSON.stringify(currentData)}. Previous: ${JSON.stringify(previousData)}. Provide a JSON response with a 'summary' and 'recommendations'.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: analysisSchema },
        });
        res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
        console.error("Error in /api/analyze:", error);
        res.status(500).json({ summary: [], recommendations: [] });
    }
});

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

app.post('/api/health-score', async (req: ExpressRequest, res: ExpressResponse) => {
    const { currentData, previousData, profile } = req.body;
    if (!currentData) return res.status(400).json({ error: 'Missing current financial data.' });
    const prompt = `Calculate a financial health score based on this data. Profile: ${JSON.stringify(profile)}. Current: ${JSON.stringify(currentData)}. Previous: ${JSON.stringify(previousData)}. Provide a JSON response with 'score', 'rating', 'strengths', and 'weaknesses'.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: healthScoreSchema },
        });
        res.json(JSON.parse(response.text ?? '{}'));
    } catch (error) {
        console.error("Error in /api/health-score:", error);
        res.status(500).json({ score: 0, rating: "Poor", strengths: [], weaknesses: [] });
    }
});

app.post('/api/explain-kpi', async (req: ExpressRequest, res: ExpressResponse) => {
    const { kpiName, kpiValue } = req.body;
    if (!kpiName || !kpiValue) return res.status(400).json({ error: 'Missing kpiName or kpiValue.' });
    const prompt = `Explain the KPI "${kpiName}" and a value of "${kpiValue}" simply for a small business owner.`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        res.json({ explanation: response.text ?? 'Could not generate explanation.' });
    } catch (error) {
        console.error("Error in /api/explain-kpi:", error);
        res.status(500).json({ explanation: 'Could not generate explanation.' });
    }
});

app.post('/api/validate-statement', async (req: ExpressRequest, res: ExpressResponse) => {
    const { content, expectedType } = req.body;
    if (!content || !expectedType) {
        return res.status(400).json({ error: 'Missing content or expectedType.' });
    }

    const classificationSchema = {
        type: Type.OBJECT,
        properties: {
            documentType: {
                type: Type.STRING,
                description: 'The classified type of the document.',
                enum: ["BalanceSheet", "IncomeStatement", "CashFlowStatement", "None"]
            },
        },
        required: ['documentType']
    };

    const prompt = `You are an expert AI accountant performing a strict document classification. Your task is to identify the type of financial statement provided.

Classify the document into one of the following four categories based on its primary structure and key terms: "BalanceSheet", "IncomeStatement", "CashFlowStatement", "None".

- A "BalanceSheet" is defined by its core structure of 'Assets', 'Liabilities', and 'Equity'. It represents a snapshot in time.
- An "IncomeStatement" (or Profit & Loss) is defined by its structure of 'Revenue' (or 'Income'/'Sales'), 'Expenses', and calculating a 'Net Income' over a period.
- A "CashFlowStatement" is defined by its structure of three main sections: 'Cash Flow from Operating Activities', 'Cash Flow from Investing Activities', and 'Cash Flow from Financing Activities'.

Analyze the following document and return a JSON object with a single key "documentType" whose value is one of the four category strings.

Document content (first 4000 characters):
"""
${content.substring(0, 4000)}
"""
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: classificationSchema
            }
        });
        
        const result = JSON.parse(response.text ?? '{"documentType": "None"}');
        const classifiedType = result.documentType;

        const typeMapServer: Record<string, string> = {
            balanceSheet: "BalanceSheet",
            incomeStatement: "IncomeStatement",
            cashFlow: "CashFlowStatement"
        };

        const expectedServerType = typeMapServer[expectedType];
        const isValid = classifiedType === expectedServerType;
        
        console.log(`LOG: Validation for ${expectedType}. AI classified as: ${classifiedType}. Result: ${isValid}`);
        res.json({ isValid });

    } catch (error) {
        console.error(`ERROR: AI validation failed for ${expectedType}. Raw error:`, error);
        res.status(500).json({ error: "The AI validation service encountered an unexpected error.", isValid: false });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`LOG: VFIN Backend server listening on port ${PORT}`);
});

import { ParsedFinancialData, AiAnalysisData, FinancialHealthScore, ClientProfile } from '../types';

// The user's actual backend URL from Google Cloud Run.
const API_BASE_URL = 'https://vfin-backend-159586360865.us-central1.run.app';

const handleApiResponse = async <T,>(response: Response): Promise<T> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `The server responded with an error (status ${response.status}), but the response was not valid JSON.` }));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    return response.json();
};

export const parseFinancialStatements = async (statements: { balanceSheet: string; incomeStatement: string; cashFlow: string }): Promise<ParsedFinancialData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statements }),
    });
    return await handleApiResponse<ParsedFinancialData>(response);
  } catch (error: any) {
    console.error("Error calling /api/parse:", error);
    throw new Error(`Failed to parse financial data. Reason: ${error.message}`);
  }
};

export const getFinancialAnalysis = async (currentData: ParsedFinancialData, previousData: ParsedFinancialData | null, profile: ClientProfile | null): Promise<AiAnalysisData> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentData, previousData, profile }),
        });
        return await handleApiResponse<AiAnalysisData>(response);
    } catch (error) {
        console.error("Error calling /api/analyze:", error);
        return {
            summary: ["Could not generate AI summary at this time."],
            recommendations: ["Could not generate AI recommendations. Please try again later."]
        };
    }
};

export const getFinancialHealthScore = async (currentData: ParsedFinancialData, previousData: ParsedFinancialData | null, profile: ClientProfile | null): Promise<FinancialHealthScore> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentData, previousData, profile }),
        });
        return await handleApiResponse<FinancialHealthScore>(response);
    } catch (error) {
        console.error("Error calling /api/health-score:", error);
        return {
            score: 40,
            rating: "Fair",
            strengths: ["Could not generate AI analysis for strengths."],
            weaknesses: ["Could not generate AI analysis for weaknesses."]
        };
    }
};

export const getKpiExplanation = async (kpiName: string, kpiValue: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/explain-kpi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kpiName, kpiValue }),
        });
        const data = await handleApiResponse<{ explanation: string }>(response);
        return data.explanation;
    } catch (error) {
        console.error("Error calling /api/explain-kpi:", error);
        return `Could not generate an explanation for ${kpiName}.`;
    }
};

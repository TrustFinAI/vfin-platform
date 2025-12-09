import { FinancialPeriodData, ClientProfile } from '../types';

const API_BASE_URL = 'https://vfin-backend-159586360865.us-central1.run.app';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

const handleApiResponse = async <T,>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => {
        if (!response.ok) throw new Error(`Server Error: ${response.status}`);
        return null;
    });
    if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
    return data;
};

export const getPeriods = async (): Promise<Pick<FinancialPeriodData, 'id' | 'periodName'>[]> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/periods`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
};

export const getPeriodData = async (id: number): Promise<FinancialPeriodData> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/period-data/${id}`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
};

export const processNewStatements = async (statements: { balanceSheet: string; incomeStatement: string; cashFlow: string; }): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/process-statements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ statements }),
    });
    return handleApiResponse(response);
};

export const deletePeriod = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/periods/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Failed to delete period.');
    }
};

export const getKpiExplanation = async (kpiName: string, kpiValue: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/explain-kpi`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ kpiName, kpiValue }),
    });
    const data = await handleApiResponse<{ explanation: string }>(response);
    return data.explanation;
};

export const validateStatementFile = async (content: string, expectedType: 'balanceSheet' | 'incomeStatement' | 'cashFlow'): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/validate-statement`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, expectedType }),
    });
    const data = await handleApiResponse<{ isValid: boolean }>(response);
    return data.isValid;
};

export const saveClientProfile = async (profile: ClientProfile, companyLogoUrl: string | null): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/vcpa/save-profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ profile, companyLogoUrl }),
    });
    return handleApiResponse(response);
};

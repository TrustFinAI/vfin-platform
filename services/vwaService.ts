import { VWAData, VWAOnboardingData, OptimizerResult, FreedomPlan } from '../types';

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

export const getVWAData = async (): Promise<VWAData> => {
    const response = await fetch(`${API_BASE_URL}/api/vwa/data`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
};

export const saveVWAOnboarding = async (data: VWAOnboardingData): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/vwa/onboarding`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export const getValuation = async (): Promise<{ businessValue: number, ownerEquity: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/vwa/valuation`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
};

export const runOptimizer = async (salary: number, distribution: number, cashFromOps: number): Promise<OptimizerResult> => {
    const response = await fetch(`${API_BASE_URL}/api/vwa/run-optimizer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ salary, distribution, cashFromOps }),
    });
    return handleApiResponse(response);
};

export const getFreedomPlan = async (scenarioId: number | null): Promise<FreedomPlan> => {
    // This is a placeholder for a real API call. The backend logic for this is complex.
    // In a real implementation, the backend would run a detailed projection.
    console.log("Fetching freedom plan for scenario:", scenarioId);
    
    // Mock data for demonstration
    const currentYear = new Date().getFullYear();
    const baseProjection = Array.from({ length: 10 }, (_, i) => ({
        year: currentYear + i,
        netWorth: 500000 * Math.pow(1.15, i)
    }));
    
    let scenarioProjection = null;
    if(scenarioId){
        scenarioProjection = Array.from({ length: 10 }, (_, i) => ({
            year: currentYear + i,
            netWorth: 500000 * Math.pow(1.25, i) // Faster growth
        }));
    }

    return Promise.resolve({ baseProjection, scenarioProjection });
};

import { ScenarioData, ScenarioInput } from '../types';

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

export const getScenarios = async (): Promise<ScenarioData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/vcfo/scenarios`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
};

export const runScenario = async (assumptions: ScenarioInput): Promise<ScenarioData> => {
    const response = await fetch(`${API_BASE_URL}/api/vcfo/run-scenario`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assumptions }),
    });
    return handleApiResponse(response);
};

export const deleteScenario = async (id: number): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/vcfo/scenarios/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
};

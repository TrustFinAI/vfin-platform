import { User } from '../types';

const API_BASE_URL = 'https://vfin-backend-159586360865.us-central1.run.app';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleApiResponse = async <T,>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => {
        // If the response has no body or is not JSON, create a generic error
        if (!response.ok) {
            throw new Error(`The server responded with an error (status ${response.status}), but the response was not valid JSON.`);
        }
        return null; // For successful responses with no body
    });

    if (!response.ok) {
        const errorMessage = data?.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    return data;
};

export const register = async (email: string, password: string, companyName: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName }),
    });
    const data = await handleApiResponse<{ user: User; token: string }>(response);
    localStorage.setItem('authToken', data.token);
    return data.user;
};

export const login = async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await handleApiResponse<{ user: User; token: string }>(response);
    localStorage.setItem('authToken', data.token);
    return data.user;
};

export const getMe = async (): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });
    return await handleApiResponse<User>(response);
};

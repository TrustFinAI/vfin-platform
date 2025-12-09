import { Product } from '../types';

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
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `The server responded with an error (status ${response.status}), but the response was not valid JSON.` }));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    return response.json();
};

export const getProducts = async (): Promise<Product[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        return await handleApiResponse<Product[]>(response);
    } catch (error: any) {
        console.error("Error fetching products:", error);
        throw new Error(`Failed to fetch product plans. Reason: ${error.message}`);
    }
};

export const createCheckoutSession = async (priceId: string): Promise<{ url: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ priceId }),
        });
        return await handleApiResponse<{ url: string }>(response);
    } catch (error: any) {
        console.error("Error creating checkout session:", error);
        throw new Error(`Could not initiate the subscription process. Reason: ${error.message}`);
    }
};

export const createPortalSession = async (): Promise<{ url: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-portal-session`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        return await handleApiResponse<{ url: string }>(response);
    } catch (error: any) {
        console.error("Error creating portal session:", error);
        throw new Error(`Could not open subscription management. Reason: ${error.message}`);
    }
};

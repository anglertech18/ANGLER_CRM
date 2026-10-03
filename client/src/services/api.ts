import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";





console.log("API_BASE_URL", API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data
    });

    return config;
}, (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data
        });

        // Normalize error messages for downstream UI handling
        (error as any).userMessage = formatApiError(error);

        // Handle token expiration / unauthorized access
        if (error.response?.status === 401) {
            console.warn(`Auth failure (401). Clearing session and redirecting to login…`);

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            // Hard redirect so React state is fully reset; preserve ?expired param for Login banner
            if (!window.location.pathname.endsWith('/login')) {
                const basename = import.meta.env.VITE_APP_BASENAME || "";
                const basePath = basename ? `/${basename}` : '';
                window.location.href = `${basePath}/login?expired=true`;
            }
        } else if (error.response?.status === 403) {
            // Forbidden: keep the user logged in and show a friendly warning
            toast.error(formatApiError(error, 'You do not have permission to perform this action.'));
        }

        return Promise.reject(error);
    }
);

/**
 * Transforms API error responses into clean, user-friendly natural language warning messages.
 */
export function formatApiError(error: any, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
    if (!error) return fallbackMessage;

    const data = error.response?.data;
    if (typeof data?.message === 'string' && data.message.trim()) {
        // Sanitize technical Prisma/SQL substrings
        return data.message
            .replace(/PrismaClientKnownRequestError/g, 'Database Error')
            .replace(/Invalid `prisma\.\w+\.\w+\(\)` invocation:/g, '')
            .replace(/Foreign key constraint failed on the field: `\w+`/g, 'Selected record is linked to another module.')
            .trim();
    }

    if (typeof data?.error === 'string' && data.error.trim()) {
        return data.error;
    }

    if (error.message === 'Network Error') {
        return 'Unable to connect to server. Please check your network connection.';
    }

    return fallbackMessage;
}

export default api;

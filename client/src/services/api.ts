import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";





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

        // Handle token expiration / unauthorized access
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn(`Auth failure (${error.response.status}). Clearing session and redirecting to login…`);

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            // Hard redirect so React state is fully reset; preserve ?expired param for Login banner
            if (!window.location.pathname.endsWith('/login')) {
                const basename = import.meta.env.VITE_APP_BASENAME || "";
                const basePath = basename ? `/${basename}` : '';
                window.location.href = `${basePath}/login?expired=true`;
            }
        }

        return Promise.reject(error);
    }
);

export default api;

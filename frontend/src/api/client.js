import axios from 'axios';

// Use environment variable in production, fall back to localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token and handle FormData
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // If the request body is FormData, let the browser set the Content-Type
        // (it needs to add the boundary parameter for multipart/form-data)
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token refresh
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    // Start refreshing
                    // We use axios directly or a separate instance to avoid infinite loops if this fails
                    const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/api/auth/refresh/`, {
                        refresh: refreshToken
                    });

                    if (response.status === 200) {
                        const { access } = response.data;

                        // Save new token
                        localStorage.setItem('access_token', access);

                        // Update default headers for future requests
                        client.defaults.headers.common['Authorization'] = `Bearer ${access}`;

                        // Update current request headers and retry
                        originalRequest.headers['Authorization'] = `Bearer ${access}`;
                        return client(originalRequest);
                    }
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    // Refresh failed - clean up and redirect
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token available
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;

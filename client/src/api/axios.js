import axios from 'axios';

// Use VITE env variable in production; fall back to the Vite dev proxy (/api)
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: BASE_URL,
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;

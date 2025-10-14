import axios from 'axios';
import useAuthStore from '@/stores/webauth';

// In development, use proxy (relative URL)
// In production, use absolute backend URL from environment variable
const baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || 'http://localhost:3000'
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance for direct /auth and /manager routes (no /api prefix)
const directBaseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || 'http://localhost:3000'
  : '';

export const apiDirect = axios.create({
  baseURL: directBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
const addAuthInterceptor = (config: any) => {
  const authStore = useAuthStore();
  const token = authStore.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

// Response interceptor to handle 401 errors
const handleUnauthorized = (error: any) => {
  if (error.response?.status === 401) {
    const authStore = useAuthStore();
    authStore.logout();
    window.location.href = '/webauth';
  }
  return Promise.reject(error);
};

api.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, handleUnauthorized);

apiDirect.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
apiDirect.interceptors.response.use((response) => response, handleUnauthorized);

export default api;

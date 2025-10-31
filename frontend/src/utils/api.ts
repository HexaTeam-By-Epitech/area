import axios from 'axios';
import useAuthStore from '@/stores/webauth';

// Always use relative URLs - they work with both:
// - Vite proxy in development
// - Nginx proxy in production Docker
const baseURL = '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance for direct /auth and /manager routes (no /api prefix)
// These routes are proxied by Vite (dev) or Nginx (prod) to the backend
const directBaseURL = '';

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

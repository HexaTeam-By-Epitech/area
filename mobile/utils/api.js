import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

const BASE_URL = Config.API_URL;

// Create axios instance for API routes (with /api prefix)
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Create axios instance for direct routes (auth, manager - no /api prefix)
export const apiDirect = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
    },
    timeout: 10000,
});

// Request interceptor to add JWT token
const addAuthInterceptor = async (config) => {
    try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Failed to get token from AsyncStorage:', error);
    }
    return config;
};

// Response interceptor to handle 401 errors
const handleUnauthorized = async (error) => {
    if (error.response?.status === 401) {
        try {
            // Clear auth state
            await Promise.all([
                AsyncStorage.removeItem('accessToken'),
                AsyncStorage.removeItem('email'),
                AsyncStorage.removeItem('userId')
            ]);

            // You might want to navigate to login screen here
            // This would require navigation ref setup
            console.log('Unauthorized - clearing auth state');
        } catch (err) {
            console.error('Failed to clear auth state:', err);
        }
    }
    return Promise.reject(error);
};

// Add interceptors to both instances
api.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, handleUnauthorized);

apiDirect.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
apiDirect.interceptors.response.use((response) => response, handleUnauthorized);

export default api;

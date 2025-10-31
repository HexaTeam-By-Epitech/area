import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

const BASE_URL = Config.API_URL;

// Validate BASE_URL on module load
if (!BASE_URL || BASE_URL === 'undefined') {
    console.error('❌ CRITICAL: API_URL is not configured!');
    console.error('❌ Set EXPO_PUBLIC_API_URL in your .env file');
    throw new Error('API_URL is not configured. Check your .env file.');
}

if (__DEV__) {
    console.log('🌐 API Base URL:', BASE_URL);
}

// Create axios instance for API routes (with /api prefix)
// NOTE: This is currently unused - all screens use apiDirect
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Create axios instance for direct routes (auth, manager - no /api prefix)
// This is the main instance used by all screens
export const apiDirect = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
    },
    timeout: 30000,
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

// Response interceptor to handle errors
const handleError = async (error) => {
    // Log network errors for debugging
    if (error.code === 'ECONNABORTED') {
        console.error('⏱️  Request timeout - Backend might be slow or unreachable');
    } else if (error.message === 'Network Error' || !error.response) {
        console.error('🌐 Network Error:', {
            message: error.message,
            config: {
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                method: error.config?.method,
            }
        });
        console.error('💡 Check that EXPO_PUBLIC_API_URL is correct and backend is running');
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
        try {
            // Clear auth state
            await Promise.all([
                AsyncStorage.removeItem('accessToken'),
                AsyncStorage.removeItem('email'),
                AsyncStorage.removeItem('userId')
            ]);

            console.log('🔓 Unauthorized - clearing auth state');
        } catch (err) {
            console.error('Failed to clear auth state:', err);
        }
    }

    return Promise.reject(error);
};

// Add interceptors to both instances
api.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, handleError);

apiDirect.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
apiDirect.interceptors.response.use((response) => response, handleError);

export default api;

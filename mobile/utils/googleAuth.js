import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { apiDirect } from './api';
import Config from '../config';

// Enable WebBrowser to dismiss after authentication
WebBrowser.maybeCompleteAuthSession();

/**
 * Initiates Google OAuth login flow and handles the callback
 * @param {Function} onSuccess - Callback function with auth result
 * @param {Function} onError - Callback function with error
 */
export async function signInWithGoogle(onSuccess, onError) {
    try {
        // Get OAuth URL from backend (with mobile=true to indicate mobile app)
        const apiUrl = '/auth/google/login/url?mobile=true';
        console.log('🔍 DEBUG - Axios request URL:', `${apiDirect.defaults.baseURL}${apiUrl}`);

        const response = await apiDirect.get(apiUrl);
        console.log('🔍 DEBUG - Response data:', response.data);

        const { url } = response.data;
        console.log('🔍 DEBUG - OAuth URL received:', url);

        if (!url) {
            throw new Error('No OAuth URL received from backend');
        }

        // Open browser for authentication
        // On Android, use different browser options to avoid redirect issues
        const browserOptions = Platform.OS === 'android'
            ? {
                showInRecents: true,
                // Try to use external browser on Android if Custom Tabs fail
                browserPackage: undefined,
            }
            : {};

        const result = await WebBrowser.openAuthSessionAsync(
            url,
            Config.OAUTH_REDIRECT_URI,
            browserOptions
        );

        if (result.type === 'success' && result.url) {
            // Extract params from callback URL
            const params = new URL(result.url).searchParams;
            const status = params.get('status');
            const type = params.get('type');

            if (status === 'error') {
                const message = params.get('message') || 'Authentication failed';
                throw new Error(message);
            }

            if (type === 'login') {
                // Login flow - extract auth data from URL params
                const accessToken = params.get('accessToken');
                const userId = params.get('userId');
                const email = params.get('email');

                if (accessToken && userId && email) {
                    onSuccess({ accessToken: decodeURIComponent(accessToken), userId: decodeURIComponent(userId), email: decodeURIComponent(email) });
                } else {
                    throw new Error('Invalid response from backend - missing auth data');
                }
            } else {
                throw new Error('Unexpected response type');
            }
        } else if (result.type === 'cancel') {
            onError(new Error('Authentication cancelled'));
        } else {
            onError(new Error('Authentication failed'));
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        console.error('🔍 DEBUG - Error details:', {
            message: error.message,
            config: error.config,
            request: error.request,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers,
        });
        onError(error);
    }
}

/**
 * Alternative: Sign in with Google ID Token (if using Google Sign-In SDK)
 * @param {string} idToken - Google ID token
 * @returns {Promise} Auth result
 */
export async function signInWithGoogleIdToken(idToken) {
    try {
        const response = await apiDirect.post('/auth/google/id-token', {
            token: idToken
        });

        return response.data;
    } catch (error) {
        console.error('Google ID token sign-in error:', error);
        throw error;
    }
}

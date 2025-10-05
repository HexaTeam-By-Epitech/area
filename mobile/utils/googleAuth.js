import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { apiDirect } from './api';

// Enable WebBrowser to dismiss after authentication
WebBrowser.maybeCompleteAuthSession();

/**
 * Initiates Google OAuth login flow and handles the callback
 * @param {Function} onSuccess - Callback function with auth result
 * @param {Function} onError - Callback function with error
 */
export async function signInWithGoogle(onSuccess, onError) {
    try {
        // Get OAuth URL from backend
        const response = await apiDirect.get('/auth/google/login/url');
        const { url } = response.data;

        if (!url) {
            throw new Error('No OAuth URL received from backend');
        }

        // Open browser for authentication
        const result = await WebBrowser.openAuthSessionAsync(url, 'exp://');

        if (result.type === 'success' && result.url) {
            // Extract code from callback URL
            const params = new URL(result.url).searchParams;
            const code = params.get('code');
            const state = params.get('state');

            if (!code) {
                throw new Error('No authorization code received');
            }

            // Exchange code for tokens via backend callback
            const callbackResponse = await apiDirect.get(`/auth/google/login/callback`, {
                params: { code, state }
            });

            const authResult = callbackResponse.data;

            if (authResult.accessToken && authResult.userId && authResult.email) {
                onSuccess(authResult);
            } else {
                throw new Error('Invalid response from backend');
            }
        } else if (result.type === 'cancel') {
            onError(new Error('Authentication cancelled'));
        } else {
            onError(new Error('Authentication failed'));
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
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

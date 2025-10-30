/**
 * Mobile App Configuration
 *
 * Uses environment variables with fallback to default values.
 * Variables are loaded at build time from .env file.
 *
 * For EAS Build, you can override these in eas.json or through secrets.
 */

const Config = {
    // Backend API URL - reads from EXPO_PUBLIC_API_URL environment variable
    // IMPORTANT: Must be set in .env file or build will use fallback
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080',

    // OAuth redirect URI (must match app.json scheme)
    OAUTH_REDIRECT_URI: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI || 'area://oauth',

    // Google OAuth Client ID
    GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '30466278889-tg1j94b3me7rqqdl5q2ibs3s4etge8bj.apps.googleusercontent.com',
};

// Validate critical configuration
if (!Config.API_URL || Config.API_URL === 'undefined') {
    console.error('⚠️  WARNING: EXPO_PUBLIC_API_URL is not set! Using fallback:', Config.API_URL);
    console.error('⚠️  Make sure to set EXPO_PUBLIC_API_URL in your .env file');
}

// Log configuration on startup (remove API_URL in production for security)
if (__DEV__) {
    console.log('📱 Mobile App Configuration:');
    console.log('  API_URL:', Config.API_URL);
    console.log('  OAUTH_REDIRECT_URI:', Config.OAUTH_REDIRECT_URI);
}

export default Config;

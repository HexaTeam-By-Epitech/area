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
    API_URL: process.env.EXPO_PUBLIC_API_URL,

    // OAuth redirect URI (must match app.json scheme)
    OAUTH_REDIRECT_URI: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI || 'area://oauth',

    // Google OAuth Client ID
    GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '30466278889-tg1j94b3me7rqqdl5q2ibs3s4etge8bj.apps.googleusercontent.com',
};

export default Config;

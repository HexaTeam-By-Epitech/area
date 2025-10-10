/**
 * Mobile App Configuration
 *
 * Change these values based on your environment:
 * - For Android emulator: use 10.0.2.2
 * - For iOS simulator: use localhost
 * - For physical device: use your machine's IP address (e.g., 192.168.1.100)
 */

const Config = {
    // Backend API URL
    API_URL: 'https://necrologically-dimensionless-charlena.ngrok-free.app',

    // OAuth redirect URI (must match app.json scheme)
    OAUTH_REDIRECT_URI: 'area://oauth',

    // Alternative URLs for different environments:
    // API_URL: 'http://localhost:3000', // iOS simulator
    // API_URL: 'http://192.168.1.100:3000', // Physical device (replace with your IP)
    // API_URL: 'https://your-production-api.com', // Production
};

export default Config;

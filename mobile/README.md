# AREA Mobile

React Native (Expo) mobile application for the AREA project.

## Technologies

- **React Native 0.81** - Cross-platform mobile framework
- **Expo 54** - Development platform for React Native
- **React 19** - UI library
- **React Navigation** - Navigation library (Drawer & Stack)
- **React Native Paper** - Material Design components
- **Axios** - HTTP client for API calls
- **AsyncStorage** - Local data persistence

## Prerequisites

- Node.js 20+
- npm 10+
- Backend API running (see `backend/README.md`)

### For development:
- **Expo Go** app on your mobile device (iOS/Android)
- Or **Android Studio** (for Android emulator)
- Or **Xcode** (for iOS simulator, macOS only)

## Environment Configuration

Edit `.env` file with your backend URL:

```bash
# .env
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

**Important URLs by environment:**
- **Android Emulator:** `http://10.0.2.2:3000`
- **iOS Simulator:** `http://localhost:3000`
- **Physical Device:** `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.100:3000`)
- **Development with ngrok:** `https://your-url.ngrok-free.app` ✅ Recommended

To find your local IP: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)

## Installation

Install dependencies:

```bash
npm ci
```

## Running the Application

### Development server

```bash
npm run start
```

### Run on platforms

```bash
npm run android  # Android emulator/device
npm run ios      # iOS simulator (macOS only)
npm run web      # Web browser
```

### Using Expo Go (Physical Device)

1. Install **Expo Go** app
2. Run `npm run start`
3. Scan QR code

## 🏗️ Building APK (Local Build)

### Prerequisites

- **Android Studio** installed
- **Java JDK 17** installed
- Environment variables configured (ANDROID_HOME, JAVA_HOME)

### Build Commands

```bash
# Build APK (for testing/sharing)
npm run build:android:apk

# Build AAB (for Play Store)
npm run build:android:bundle
```

**APK output:** `android/app/build/outputs/apk/release/app-release.apk`
**AAB output:** `android/app/build/outputs/bundle/release/app-release.aab`

### Install APK on device

```bash
# Via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or transfer the APK file to your phone and install manually
```

### First-time build setup

If you get signing errors, generate a keystore:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Then edit `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-password
MYAPP_RELEASE_KEY_PASSWORD=your-password
```

## Testing

Run tests with Jest:

```bash
npm test
```

This project uses `jest-expo` preset for testing React Native components.

## Features

### Authentication
- **Email/Password Authentication** - Login and registration with email
- **Google Sign-In** - OAuth 2.0 authentication with Google
- **Persistent Sessions** - Access tokens stored in AsyncStorage
- **Auto-logout on 401** - Automatic session cleanup on unauthorized requests

### Service Management
- **Connect Services** - Link external services (Google, Spotify, etc.)
- **OAuth Integration** - Seamless OAuth 2.0 flow for service linking
- **View Linked Services** - See all connected services and their status
- **Disconnect Services** - Unlink services with confirmation

### AREA Management
- **List AREAs** - View all your automation workflows
- **Create AREAs** - Build new action-reaction pairs
- **Dynamic Configuration** - Configure reactions with auto-generated forms
- **Delete AREAs** - Remove workflows with confirmation
- **Pull to Refresh** - Refresh your AREAs list
- **Real-time Status** - See active/inactive status of each AREA

### User Account
- **View Profile** - See your email and token information
- **Logout** - Secure logout with session cleanup

## Project Structure

```
mobile/
├── context/                 # React Context providers
│   └── AuthContext.js       # Authentication state management
├── screens/                 # Screen components
│   ├── LoginScreen.js       # Login/Register with Google Sign-In
│   ├── HomeScreen.js        # Home dashboard
│   ├── DashboardScreen.js   # List and manage AREAs
│   ├── CreateAreaScreen.js  # Create new AREA with action/reaction
│   ├── ServicesScreen.js    # Connect/disconnect services
│   ├── MyAccountScreen.js   # User account and logout
│   ├── LandingScreen.js     # Landing page
│   └── ProjectScreen.js     # Project details
├── utils/                   # Utility functions
│   ├── api.js               # Axios instances with interceptors
│   └── googleAuth.js        # Google OAuth helper
├── components/              # Reusable components
│   ├── Button.js            # Button component
│   └── Card.js              # Card component
├── assets/                  # Images, icons, fonts
├── config.js                # App configuration (API URL)
├── App.js                   # Application entry point with navigation
├── index.js                 # Expo entry point
├── styles.js                # Global styles
├── app.json                 # Expo configuration
└── package.json             # Dependencies and scripts
```

## Configuration

### config.js

The `config.js` file contains the backend API URL. Update this based on your environment:

```javascript
const Config = {
    API_URL: 'http://10.0.2.2:3000', // Android emulator
    // API_URL: 'http://localhost:3000', // iOS simulator
    // API_URL: 'http://192.168.1.100:3000', // Physical device
};
```

### app.json

The `app.json` file contains Expo configuration:
- App name and slug
- Version and build numbers
- Icons and splash screens
- Platform-specific settings
- Orientation and status bar

## Backend Integration

The mobile app integrates with the backend API through the following endpoints:

### Authentication
- `POST /auth/login` - Email/password login
- `POST /auth/register` - User registration
- `POST /auth/google/id-token` - Google ID token authentication
- `GET /auth/google/login/url` - Get Google OAuth URL
- `GET /auth/google/login/callback` - Handle OAuth callback

### Services
- `GET /auth/providers` - Get available OAuth providers
- `GET /auth/linked-providers` - Get user's linked providers
- `GET /auth/:provider/url` - Get OAuth URL for specific provider
- `DELETE /auth/:provider/link` - Unlink a provider

### AREA Management
- `GET /manager/areas` - Get user's AREAs
- `POST /manager/areas` - Create new AREA
- `DELETE /manager/areas/:id` - Delete an AREA
- `GET /manager/actions` - Get available actions
- `GET /manager/reactions` - Get available reactions with config schemas

All authenticated requests include the JWT token in the `Authorization` header via axios interceptors.

## Development Tips

### Hot Reloading

Expo supports hot reloading. When you save a file, the app automatically reloads with your changes.

### Debugging

- Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open the dev menu
- Enable "Debug Remote JS" to use Chrome DevTools
- Use `console.log()` to debug

### React Native Debugger

Install [React Native Debugger](https://github.com/jhen0409/react-native-debugger) for a better debugging experience with Redux DevTools.

## Building for Production

### Android APK

```bash
npx expo build:android
```

### iOS IPA

```bash
npx expo build:ios
```

**Note:** Building iOS apps requires an Apple Developer account.

### EAS Build (Recommended)

Use Expo Application Services (EAS) for modern builds:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Troubleshooting

### Connection to backend fails

1. Verify backend is running on the expected URL
2. Check `EXPO_PUBLIC_API_URL` in `.env`
3. If using physical device:
   - Use your local IP instead of `localhost`
   - Ensure phone and computer are on same network
   - Check firewall settings

### Expo Go app crashes

- Clear Expo cache: `npx expo start -c`
- Restart Expo Go app
- Reinstall Expo Go from app store

### Build errors

- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Clear Expo cache: `npx expo start -c`
- Clear Metro bundler cache: `npx expo start --clear`

### Module not found errors

After adding new dependencies, restart the Expo server:

```bash
npx expo start -c
```

## Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## License

This project is for educational purposes.

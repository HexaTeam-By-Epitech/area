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

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and configure:

- `EXPO_PUBLIC_API_URL` - Backend API URL

**Important:** For testing on a physical device, use your computer's local IP address instead of `localhost`:

```bash
# For emulator/simulator
EXPO_PUBLIC_API_URL=http://localhost:3000

# For physical device on same network
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

To find your local IP:
- **macOS/Linux:** `ifconfig` or `ip addr`
- **Windows:** `ipconfig`

## Installation

Install dependencies:

```bash
npm ci
```

## Running the Application

### Start Expo development server

```bash
npm run start
```

This will start the Expo development server and show a QR code.

### Run on different platforms

```bash
# Android (emulator or connected device)
npm run android

# iOS (simulator, macOS only)
npm run ios

# Web browser
npm run web
```

### Using Expo Go (Physical Device)

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `npm run start`
3. Scan the QR code with:
   - **iOS:** Camera app
   - **Android:** Expo Go app

**Note:** Make sure your phone and computer are on the same Wi-Fi network.

## Testing

Run tests with Jest:

```bash
npm test
```

This project uses `jest-expo` preset for testing React Native components.

## Project Structure

```
mobile/
├── screens/                 # Screen components
│   ├── LoginScreen.js       # Login/Register screen
│   ├── HomeScreen.js        # Home screen
│   ├── MyAccountScreen.js   # User account screen
│   └── ...                  # Other screens
├── assets/                  # Images, icons, fonts
├── App.js                   # Application entry point
├── index.js                 # Expo entry point
├── styles.js                # Global styles
├── app.json                 # Expo configuration
├── .env.example             # Environment variables template
└── package.json             # Dependencies and scripts
```

## Configuration

### app.json

The `app.json` file contains Expo configuration:
- App name and slug
- Version and build numbers
- Icons and splash screens
- Platform-specific settings
- Orientation and status bar

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

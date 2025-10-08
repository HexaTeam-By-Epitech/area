// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
    makeRedirectUri: jest.fn(() => 'exp://'),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        dispatch: jest.fn(),
    }),
    useRoute: () => ({
        params: {},
    }),
    useFocusEffect: jest.fn((callback) => {
        // Execute callback using useEffect to avoid timing issues
        const React = require('react');
        React.useEffect(() => {
            callback();
        }, []);
    }),
    CommonActions: {
        reset: jest.fn(),
    },
}));

// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ data: {} })),
        post: jest.fn(() => Promise.resolve({ data: {} })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
        },
    })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

// Mock Alert
jest.spyOn(require('react-native').Alert, 'alert');

// Silence console warnings during tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};

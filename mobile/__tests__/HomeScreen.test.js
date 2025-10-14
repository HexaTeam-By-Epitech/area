import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { AuthProvider } from '../context/AuthContext';

// Mock the auth context with test data
const mockAuthContext = {
    accessToken: 'fake-token',
    email: 'test@test.com',
    userId: 'user-123',
    isLoading: false,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    getToken: jest.fn(() => 'fake-token'),
};

jest.mock('../context/AuthContext', () => ({
    ...jest.requireActual('../context/AuthContext'),
    useAuth: () => mockAuthContext,
}));

// Mock the API
jest.mock('../utils/api', () => ({
    apiDirect: {
        get: jest.fn().mockResolvedValue({
            data: []
        }),
    },
}));

// Mock useFocusEffect
jest.mock('@react-navigation/native', () => ({
    useFocusEffect: (callback) => {
        // Don't execute the callback in tests to avoid API calls
    },
}));

describe('HomeScreen', () => {
    const mockNavigation = { navigate: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders welcome message and quick actions', async () => {
        const { getByText } = render(
            <AuthProvider>
                <HomeScreen navigation={mockNavigation} />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByText('Welcome back!')).toBeTruthy();
            expect(getByText('test@test.com')).toBeTruthy();
            expect(getByText('Quick Actions')).toBeTruthy();
            expect(getByText('Create New AREA')).toBeTruthy();
        });
    });

    it('navigates to CreateArea on Create New AREA button press', async () => {
        const { getByText } = render(
            <AuthProvider>
                <HomeScreen navigation={mockNavigation} />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByText('Create New AREA')).toBeTruthy();
        });

        fireEvent.press(getByText('Create New AREA'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateArea');
    });
});

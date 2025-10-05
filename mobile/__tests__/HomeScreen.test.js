import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

describe('HomeScreen', () => {
    const mockNavigation = { navigate: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders welcome message and button', () => {
        const { getByText } = render(
            <AuthProvider>
                <HomeScreen navigation={mockNavigation} />
            </AuthProvider>
        );
        expect(getByText('Welcome test@test.com')).toBeTruthy();
        expect(getByText('My Account')).toBeTruthy();
    });

    it('navigates to MyAccount on button press', () => {
        const { getByText } = render(
            <AuthProvider>
                <HomeScreen navigation={mockNavigation} />
            </AuthProvider>
        );
        fireEvent.press(getByText('My Account'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('MyAccount');
    });
});

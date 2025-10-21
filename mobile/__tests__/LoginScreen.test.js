import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import { apiDirect } from '../utils/api';
import { Alert } from 'react-native';

// Mock the auth context
const mockLogin = jest.fn();
const mockAuthContext = {
    accessToken: null,
    email: null,
    userId: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
    logout: jest.fn(),
    getToken: jest.fn(),
};

jest.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => children,
    useAuth: () => mockAuthContext,
}));

jest.mock('../utils/api', () => ({
    apiDirect: {
        post: jest.fn(),
        get: jest.fn(),
    },
}));

jest.mock('../utils/googleAuth', () => ({
    signInWithGoogle: jest.fn(),
}));

describe('LoginScreen', () => {
    const mockNavigation = {
        navigate: jest.fn(),
        reset: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders inputs and buttons', () => {
        const { getByPlaceholderText, getByText } = render(
            <LoginScreen navigation={mockNavigation} />
        );
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
        expect(getByText('Login')).toBeTruthy();
        expect(getByText('Register')).toBeTruthy();
        expect(getByText('Sign in with Google')).toBeTruthy();
    });

    it('shows error when trying to login without email and password', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');

        const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
        fireEvent.press(getByText('Login'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Error', 'Please enter email and password');
        });
    });

    it('calls login and navigation on successful login', async () => {
        apiDirect.post.mockResolvedValue({
            data: {
                accessToken: 'fake-token',
                userId: 'user-123',
                email: 'test@test.com'
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <LoginScreen navigation={mockNavigation} />
        );

        fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Login'));

        await waitFor(() => {
            expect(apiDirect.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@test.com',
                password: 'password123',
            });
            expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'fake-token', 'user-123');
            // Navigation is now handled automatically by AppNavigator, not by LoginScreen
        });
    });

    it('calls register and navigation on successful registration', async () => {
        apiDirect.post.mockResolvedValueOnce({
            data: {
                email: 'test@test.com',
            }
        });
        // Mock la vérification du code
        apiDirect.post.mockResolvedValueOnce({
            data: {
                message: 'Email verified successfully',
                accessToken: 'fake-token',
                userId: 'user-123',
                email: 'test@test.com'
            }
        });

        const { getByPlaceholderText, getByText, queryByText, getByDisplayValue } = render(
            <LoginScreen navigation={mockNavigation} />
        );

        fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Register'));

        // Attendre l'apparition du modal de vérification
        await waitFor(() => {
            expect(queryByText('Account verification')).toBeTruthy();
        });

        // Saisir le code de vérification (le TextInput n'a pas de placeholder, on utilise getByDisplayValue)
        const codeInput = getByDisplayValue('');
        fireEvent.changeText(codeInput, '123456');
        fireEvent.press(getByText('Vérifier'));

        await waitFor(() => {
            expect(apiDirect.post).toHaveBeenCalledWith('/auth/register', {
                email: 'test@test.com',
                password: 'password123',
            });
            expect(apiDirect.post).toHaveBeenCalledWith('/auth/verify-email', {
                email: 'test@test.com',
                verificationCode: '123456',
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'fake-token', 'user-123');
        });
    });

    it('shows error alert on failed login', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        apiDirect.post.mockRejectedValueOnce({
            response: {
                data: { message: 'Invalid credentials' }
            }
        });

        const { getByPlaceholderText, getByText } = render(
            <LoginScreen navigation={mockNavigation} />
        );

        fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
        fireEvent.press(getByText('Login'));

        await waitFor(() => {
            expect(apiDirect.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@test.com',
                password: 'wrongpassword',
            });
            expect(alertSpy).toHaveBeenCalledWith('Error', 'Invalid credentials');
        });
    });
});

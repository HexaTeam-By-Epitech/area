import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import axios from 'axios';

jest.mock('axios');

describe('LoginScreen', () => {
    const mockNavigation = { navigate: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders inputs and buttons', () => {
        const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={mockNavigation} />);
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
        expect(getByText('Login')).toBeTruthy();
        expect(getByText('Register')).toBeTruthy();
    });

    it('calls navigation on Login button press', async () => {
        axios.post.mockResolvedValue({ data: { token: 'fake-token' } });

        const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
        fireEvent.press(getByText('Login'));

        await waitFor(() => {
            expect(mockNavigation.navigate).toHaveBeenCalledWith('Home', { token: 'fake-token', email: '' });
        });
    });

    it('calls navigation on Register button press', async () => {
        axios.post.mockResolvedValue({ data: { token: 'fake-token' } });

        const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
        fireEvent.press(getByText('Register'));

        await waitFor(() => {
            expect(mockNavigation.navigate).toHaveBeenCalledWith('Home', { token: 'fake-token', email: '' });
        });
    });
});

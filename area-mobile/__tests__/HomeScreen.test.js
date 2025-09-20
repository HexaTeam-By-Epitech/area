import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

describe('HomeScreen', () => {
    const mockNavigation = { navigate: jest.fn() };
    const route = { params: { token: 'fake-token', email: 'test@test.com' } };

    it('renders welcome message and button', () => {
        const { getByText } = render(<HomeScreen navigation={mockNavigation} route={route} />);
        expect(getByText('Welcome test@test.com')).toBeTruthy();
        expect(getByText('My Account')).toBeTruthy();
    });

    it('navigates to MyAccount on button press', () => {
        const { getByText } = render(<HomeScreen navigation={mockNavigation} route={route} />);
        fireEvent.press(getByText('My Account'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('MyAccount', { token: 'fake-token', email: 'test@test.com' });
    });
});

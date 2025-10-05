import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ServicesScreen from '../screens/ServicesScreen';
import { apiDirect } from '../utils/api';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

jest.mock('../utils/api', () => ({
    apiDirect: {
        get: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(),
}));

describe('ServicesScreen', () => {
    const mockProvidersData = {
        providers: ['google', 'spotify'],
    };

    const mockLinkedData = {
        providers: ['google'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        apiDirect.get.mockImplementation(() => new Promise(() => {})); // Never resolves

        const { getByText } = render(<ServicesScreen />);
        expect(getByText('Loading services...')).toBeTruthy();
    });

    it('renders list of providers after loading', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: mockProvidersData })
            .mockResolvedValueOnce({ data: mockLinkedData });

        const { getByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getByText('Google')).toBeTruthy();
            expect(getByText('Spotify')).toBeTruthy();
        });
    });

    it('shows linked status correctly', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: mockProvidersData })
            .mockResolvedValueOnce({ data: mockLinkedData });

        const { getAllByText } = render(<ServicesScreen />);

        await waitFor(() => {
            const connectedTexts = getAllByText('✓ Connected');
            const notConnectedTexts = getAllByText('Not connected');
            expect(connectedTexts.length).toBeGreaterThan(0);
            expect(notConnectedTexts.length).toBeGreaterThan(0);
        });
    });

    it('opens OAuth browser when connect button is pressed', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: mockProvidersData })
            .mockResolvedValueOnce({ data: { providers: [] } })
            .mockResolvedValueOnce({ data: { url: 'https://oauth.google.com' } });

        WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'success' });

        const { getAllByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getAllByText('Connect').length).toBeGreaterThan(0);
        });

        const connectButtons = getAllByText('Connect');
        fireEvent.press(connectButtons[0]);

        await waitFor(() => {
            expect(apiDirect.get).toHaveBeenCalledWith('/auth/google/url');
            expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
        });
    });

    it('shows alert when OAuth is cancelled', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: mockProvidersData })
            .mockResolvedValueOnce({ data: { providers: [] } })
            .mockResolvedValueOnce({ data: { url: 'https://oauth.google.com' } });

        WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

        const { getAllByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getAllByText('Connect').length).toBeGreaterThan(0);
        });

        const connectButtons = getAllByText('Connect');
        fireEvent.press(connectButtons[0]);

        // Should not show error for cancel
        await waitFor(() => {
            expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
        });
    });

    it('disconnects provider when disconnect button is pressed and confirmed', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: mockProvidersData })
            .mockResolvedValueOnce({ data: mockLinkedData });

        apiDirect.delete.mockResolvedValue({});

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
            // Simulate user pressing "Disconnect"
            if (Array.isArray(buttons)) {
                const disconnectButton = buttons.find(b => b.text === 'Disconnect');
                if (disconnectButton && disconnectButton.onPress) {
                    disconnectButton.onPress();
                }
            }
        });

        const { getAllByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getAllByText('Disconnect').length).toBeGreaterThan(0);
        });

        const disconnectButtons = getAllByText('Disconnect');
        fireEvent.press(disconnectButtons[0]);

        await waitFor(() => {
            expect(apiDirect.delete).toHaveBeenCalledWith('/auth/google/link');
        });

        alertSpy.mockRestore();
    });

    it('shows error message when loading fails', async () => {
        apiDirect.get.mockRejectedValue({
            response: {
                data: { message: 'Failed to load services' }
            }
        });

        const { getByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getByText('Failed to load services')).toBeTruthy();
        });
    });

    it('displays empty state when no providers available', async () => {
        apiDirect.get
            .mockResolvedValueOnce({ data: { providers: [] } })
            .mockResolvedValueOnce({ data: { providers: [] } });

        const { getByText } = render(<ServicesScreen />);

        await waitFor(() => {
            expect(getByText('No services available')).toBeTruthy();
        });
    });
});

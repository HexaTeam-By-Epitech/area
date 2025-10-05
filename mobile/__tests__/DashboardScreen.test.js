import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import { apiDirect } from '../utils/api';
import { Alert } from 'react-native';

jest.mock('../utils/api', () => ({
    apiDirect: {
        get: jest.fn(),
        delete: jest.fn(),
    },
}));

describe('DashboardScreen', () => {
    const mockNavigation = {
        navigate: jest.fn(),
    };

    const mockAreas = [
        {
            id: 'area-1',
            action: 'new_email',
            reaction: 'send_notification',
            config: { message: 'You have a new email' },
            is_active: true,
            created_at: '2024-01-01T00:00:00.000Z',
        },
        {
            id: 'area-2',
            action: 'new_spotify_song',
            reaction: 'send_email',
            config: { to: 'test@test.com' },
            is_active: false,
            created_at: '2024-01-02T00:00:00.000Z',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        apiDirect.get.mockImplementation(() => new Promise(() => {})); // Never resolves

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
        expect(getByText('Loading your AREAs...')).toBeTruthy();
    });

    it('renders list of areas after loading', async () => {
        apiDirect.get.mockResolvedValue({ data: mockAreas });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText('new_email')).toBeTruthy();
            expect(getByText('send_notification')).toBeTruthy();
            expect(getByText('new_spotify_song')).toBeTruthy();
            expect(getByText('send_email')).toBeTruthy();
        });
    });

    it('renders empty state when no areas', async () => {
        apiDirect.get.mockResolvedValue({ data: [] });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText("You don't have any AREAs yet.")).toBeTruthy();
            expect(getByText('Create your first AREA')).toBeTruthy();
        });
    });

    it('navigates to create area screen when create button is pressed', async () => {
        apiDirect.get.mockResolvedValue({ data: [] });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText('Create your first AREA')).toBeTruthy();
        });

        fireEvent.press(getByText('Create your first AREA'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateArea');
    });

    it('renders create button for non-empty areas list', async () => {
        apiDirect.get.mockResolvedValue({ data: mockAreas });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText('+ Create AREA')).toBeTruthy();
        });

        fireEvent.press(getByText('+ Create AREA'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateArea');
    });

    it('shows error message when loading fails', async () => {
        apiDirect.get.mockRejectedValue({
            response: {
                data: { message: 'Failed to load areas' }
            }
        });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText('Failed to load areas')).toBeTruthy();
        });
    });

    it('displays area status correctly', async () => {
        apiDirect.get.mockResolvedValue({ data: mockAreas });

        const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(getByText('Active')).toBeTruthy();
            expect(getByText('Inactive')).toBeTruthy();
        });
    });
});

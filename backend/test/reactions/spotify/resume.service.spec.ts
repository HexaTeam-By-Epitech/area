import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyResumeService } from '../../../src/modules/reactions/spotify/resume.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

// Mock UsersService
const mockUsersService = {
    findLinkedAccount: jest.fn(),
};

// Mock AuthService
const mockAuthService = {
    getCurrentAccessToken: jest.fn(),
    oAuth2ApiRequest: jest.fn(),
};

describe('SpotifyResumeService', () => {
    let service: SpotifyResumeService;
    let usersService: typeof mockUsersService;
    let authService: typeof mockAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SpotifyResumeService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        service = module.get<SpotifyResumeService>(SpotifyResumeService);
        usersService = module.get(UsersService);
        authService = module.get(AuthService);
        jest.clearAllMocks();
    });

    describe('run', () => {
        const userId = 'user-123';

        it('should resume playback successfully when user has linked Spotify account and valid token', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 204 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId);

            // Assert
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Spotify, userId);
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    method: 'PUT',
                    url: 'https://api.spotify.com/v1/me/player/play',
                    headers: {
                        Authorization: `Bearer ${mockAccessToken}`,
                    },
                })
            );
        });

        it('should resume playback with optional params', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 204 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId, { someParam: 'value' });

            // Assert
            expect(authService.oAuth2ApiRequest).toHaveBeenCalled();
        });

        it('should throw error when user does not have linked Spotify account', async () => {
            // Arrange
            usersService.findLinkedAccount.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId)).rejects.toThrow('Spotify account not linked');
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
            expect(authService.getCurrentAccessToken).not.toHaveBeenCalled();
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw error when access token cannot be obtained', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId)).rejects.toThrow('Failed to obtain access token');
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Spotify, userId);
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw specific error when no active device is found (404)', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockError = {
                response: {
                    status: 404,
                    data: { error: { message: 'Device not found' } },
                },
            };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(service.run(userId)).rejects.toThrow('No active Spotify device found');
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    method: 'PUT',
                    url: 'https://api.spotify.com/v1/me/player/play',
                })
            );
        });

        it('should throw generic error when Spotify API request fails with other error', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockError = {
                response: {
                    status: 403,
                    data: { error: { message: 'Forbidden' } },
                },
            };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(service.run(userId)).rejects.toThrow('Failed to resume Spotify playback');
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    method: 'PUT',
                    url: 'https://api.spotify.com/v1/me/player/play',
                })
            );
        });

        it('should handle network errors gracefully', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const networkError = new Error('Network error');

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockRejectedValue(networkError);

            // Act & Assert
            await expect(service.run(userId)).rejects.toThrow('Failed to resume Spotify playback');
        });
    });

    describe('getFields', () => {
        it('should return empty array as no configuration is needed', () => {
            // Act
            const fields = service.getFields();

            // Assert
            expect(fields).toEqual([]);
            expect(fields).toHaveLength(0);
        });
    });
});

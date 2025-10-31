import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyLikeReactionService } from '../../../src/modules/reactions/spotify/like.service';
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

describe('SpotifyLikeReactionService', () => {
    let service: SpotifyLikeReactionService;
    let usersService: typeof mockUsersService;
    let authService: typeof mockAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SpotifyLikeReactionService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        service = module.get<SpotifyLikeReactionService>(SpotifyLikeReactionService);
        usersService = module.get(UsersService);
        authService = module.get(AuthService);
        jest.clearAllMocks();
    });

    describe('run', () => {
        const userId = 'user-123';
        const params = {
            trackId: '3n3Ppam7vgaVa1iaRUc9Lp',
        };

        it('should like a track successfully when user has linked Spotify account and valid token', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 200 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId, params);

            // Assert
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Spotify, userId);
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    method: 'PUT',
                    url: 'https://api.spotify.com/v1/me/tracks',
                    headers: {
                        Authorization: `Bearer ${mockAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        ids: [params.trackId],
                    },
                })
            );
        });

        it('should throw error when user does not have linked Spotify account', async () => {
            // Arrange
            usersService.findLinkedAccount.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Spotify account not linked');
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
            await expect(service.run(userId, params)).rejects.toThrow('Failed to obtain access token');
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Spotify, userId);
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw error when trackId is empty or missing', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);

            // Act & Assert
            await expect(service.run(userId, { trackId: '' })).rejects.toThrow('Track ID is required');
            await expect(service.run(userId, { trackId: '   ' })).rejects.toThrow('Track ID is required');
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should clean track ID by removing query parameters', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 200 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId, { trackId: '20X3JnZ5J6eNGXpypFQNxa?si=3d3db895c1534063' });

            // Assert
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    data: {
                        ids: ['20X3JnZ5J6eNGXpypFQNxa'], // Query params removed
                    },
                })
            );
        });

        it('should extract track ID from full Spotify URL', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 200 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId, { trackId: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc123' });

            // Assert
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    data: {
                        ids: ['3n3Ppam7vgaVa1iaRUc9Lp'], // Extracted and cleaned
                    },
                })
            );
        });

        it('should throw error for invalid track ID format', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);

            // Act & Assert
            await expect(service.run(userId, { trackId: 'invalid@track#id!' })).rejects.toThrow('Invalid track ID format');
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw error when Spotify API request fails', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockError = {
                response: {
                    status: 404,
                    data: { error: { message: 'Track not found' } },
                },
            };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Failed to like track on Spotify');
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    method: 'PUT',
                    url: 'https://api.spotify.com/v1/me/tracks',
                })
            );
        });

        it('should handle multiple track IDs by liking the provided track', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'spotify' };
            const mockAccessToken = 'valid-spotify-access-token';
            const mockApiResponse = { data: {}, status: 200 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest.mockResolvedValue(mockApiResponse);

            // Act
            await service.run(userId, { trackId: '7ouMYWpwJ422jRcDASZB7P' });

            // Assert
            expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
                ProviderKeyEnum.Spotify,
                userId,
                expect.objectContaining({
                    data: {
                        ids: ['7ouMYWpwJ422jRcDASZB7P'],
                    },
                })
            );
        });
    });

    describe('getFields', () => {
        it('should return correct field schema', () => {
            // Act
            const fields = service.getFields();

            // Assert
            expect(fields).toEqual([
                {
                    name: 'trackId',
                    type: 'string',
                    required: true,
                },
            ]);
        });
    });
});

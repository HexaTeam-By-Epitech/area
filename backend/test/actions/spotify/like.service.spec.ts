import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyLikeService } from '../../../src/modules/actions/spotify/like.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

// Mocks
const mockUsersService = { findLinkedAccount: jest.fn() };
const mockAuthService = { oAuth2ApiRequest: jest.fn() };
const mockRedisService = { getValue: jest.fn(), setValue: jest.fn() };

describe('SpotifyLikeService', () => {
  let service: SpotifyLikeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotifyLikeService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SpotifyLikeService>(SpotifyLikeService);
  });

  describe('supports', () => {
    it('should support spotify_has_likes action', () => {
      expect(service.supports(ActionNamesEnum.SPOTIFY_HAS_LIKES)).toBe(true);
      expect(service.supports('other_action')).toBe(false);
    });
  });

  describe('hasNewSpotifyLike', () => {
    const userId = 'user-1';

    it('should return code -1 when Spotify provider not linked', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue(null);
      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(-1);
      expect(mockUsersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Spotify);
    });

    it('should return code 1 when no liked tracks found', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: { items: [] },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`spotify:last_like_at:${userId}`, '');
    });

    it('should baseline first liked track and return code 1 (no trigger)', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue(null);
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          items: [
            {
              track: {
                id: 'track-1',
                name: 'Bohemian Rhapsody',
                artists: [{ name: 'Queen' }],
                album: {
                  name: 'A Night at the Opera',
                  release_date: '1975-11-21',
                },
                duration_ms: 354947,
                external_urls: { spotify: 'https://open.spotify.com/track/1' },
              },
              added_at: '2025-01-15T10:00:00Z',
            },
          ],
        },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(
        `spotify:last_like_at:${userId}`,
        '2025-01-15T10:00:00Z'
      );
    });

    it('should detect new like and return code 0 with track data when added_at is newer', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('2025-01-15T10:00:00Z');
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          items: [
            {
              track: {
                id: 'track-2',
                name: 'Stairway to Heaven',
                artists: [{ name: 'Led Zeppelin' }],
                album: {
                  name: 'Led Zeppelin IV',
                  release_date: '1971-11-08',
                },
                duration_ms: 482830,
                external_urls: { spotify: 'https://open.spotify.com/track/2' },
              },
              added_at: '2025-01-15T11:00:00Z',
            },
          ],
        },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(0);
      expect(result.data).toEqual({
        SPOTIFY_LIKED_SONG_NAME: 'Stairway to Heaven',
        SPOTIFY_LIKED_SONG_ARTIST: 'Led Zeppelin',
        SPOTIFY_LIKED_SONG_ALBUM: 'Led Zeppelin IV',
        SPOTIFY_LIKED_SONG_ALBUM_RELEASE_DATE: '1971-11-08',
        SPOTIFY_LIKED_SONG_DURATION_MS: '482830',
        SPOTIFY_LIKED_SONG_URL: 'https://open.spotify.com/track/2',
        SPOTIFY_LIKED_SONG_ID: 'track-2',
        SPOTIFY_LIKED_SONG_ADDED_AT: '2025-01-15T11:00:00Z',
      });
      expect(mockRedisService.setValue).toHaveBeenCalledWith(
        `spotify:last_like_at:${userId}`,
        '2025-01-15T11:00:00Z'
      );
    });

    it('should return code 1 when added_at unchanged', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('2025-01-15T10:00:00Z');
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          items: [
            {
              track: {
                id: 'track-1',
                name: 'Bohemian Rhapsody',
                artists: [{ name: 'Queen' }],
                album: {
                  name: 'A Night at the Opera',
                  release_date: '1975-11-21',
                },
                duration_ms: 354947,
                external_urls: { spotify: 'https://open.spotify.com/track/1' },
              },
              added_at: '2025-01-15T10:00:00Z',
            },
          ],
        },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(1);
    });

    it('should handle track with multiple artists', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('2025-01-15T10:00:00Z');
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          items: [
            {
              track: {
                id: 'track-3',
                name: 'Under Pressure',
                artists: [{ name: 'Queen' }, { name: 'David Bowie' }],
                album: {
                  name: 'Hot Space',
                  release_date: '1982-05-21',
                },
                duration_ms: 248133,
                external_urls: { spotify: 'https://open.spotify.com/track/3' },
              },
              added_at: '2025-01-15T11:30:00Z',
            },
          ],
        },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(0);
      expect(result.data?.SPOTIFY_LIKED_SONG_ARTIST).toBe('Queen, David Bowie');
    });

    it('should handle missing track data gracefully', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('2025-01-15T10:00:00Z');
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          items: [
            {
              track: {
                id: 'track-4',
                // missing name, artists, album, etc.
              },
              added_at: '2025-01-15T12:00:00Z',
            },
          ],
        },
        status: 200,
      });

      const result = await service.hasNewSpotifyLike(userId);
      expect(result.code).toBe(0);
      expect(result.data?.SPOTIFY_LIKED_SONG_NAME).toBe('Unknown');
      expect(result.data?.SPOTIFY_LIKED_SONG_ARTIST).toBe('Unknown');
      expect(result.data?.SPOTIFY_LIKED_SONG_ALBUM).toBe('Unknown');
    });
  });

  describe('getPlaceholders', () => {
    it('should return list of Spotify placeholders', () => {
      const placeholders = service.getPlaceholders();
      expect(placeholders).toHaveLength(8);

      const keys = placeholders.map(p => p.key);
      expect(keys).toContain('SPOTIFY_LIKED_SONG_NAME');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_ARTIST');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_ALBUM');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_ALBUM_RELEASE_DATE');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_DURATION_MS');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_URL');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_ID');
      expect(keys).toContain('SPOTIFY_LIKED_SONG_ADDED_AT');

      // Check that each placeholder has description and example
      placeholders.forEach(placeholder => {
        expect(placeholder.description).toBeDefined();
        expect(placeholder.example).toBeDefined();
      });
    });
  });
});

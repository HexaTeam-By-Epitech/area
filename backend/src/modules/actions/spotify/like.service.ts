import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import type { PollingAction, ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';

/**
 * Spotify polling action that detects if the user has liked a new track.
 *
 * This service periodically queries the Spotify Web API for the most recently
 * saved track ("liked" track) of a user and compares it with a timestamp
 * stored in Redis to determine if a new like occurred.
 *
 * Implements the `PollingAction` interface with action name `ActionNamesEnum.SPOTIFY_HAS_LIKES`.
 */
@Injectable()
export class SpotifyLikeService implements PollingAction {
  /**
   * In-memory map of active polling intervals keyed by `userId`.
   */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  /** Logger instance scoped to this service. */
  private readonly logger = new Logger(SpotifyLikeService.name);

  constructor(
    /** Users domain service used to resolve linked provider accounts. */
    private readonly usersService: UsersService,
    /** Auth service used to perform OAuth2-authenticated requests to Spotify. */
    private readonly authService: AuthService,
    /** Redis service used as a cache to store the last seen like timestamp. */
    private readonly redisService: RedisService,
  ) {}

  // PollingAction interface
  /**
   * Returns whether this action supports the given `actionName`.
   *
   * @param actionName - The identifier of the action to check.
   * @returns `true` if the action name is `ActionNamesEnum.SPOTIFY_HAS_LIKES`.
   */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.SPOTIFY_HAS_LIKES;
  }

  /**
   * Starts polling for the given user and emits results to the provided callback.
   *
   * @param userId - The user identifier.
   * @param emit - Callback invoked with the ActionResult containing code and track data.
   */
  start(userId: string, emit: (result: ActionResult) => void): void {
    this.startPolling(userId, emit);
  }

  /**
   * Stops polling for the given user.
   *
   * @param userId - The user identifier.
   */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /**
   * Checks if the user has a new liked track on Spotify compared to the
   * last stored timestamp in Redis.
   *
   * @param userId - The user identifier.
   * @returns A promise resolving to an ActionResult with code and track data.
   */
  async hasNewSpotifyLike(userId: string): Promise<ActionResult> {
    const cacheKey = `spotify:last_like_at:${userId}`;

    try {
      // Ensure the user has a linked Spotify account
      const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Spotify);
      if (!linked) return { code: -1 };

      // Call Spotify API to fetch the most recently liked track (limit 1)
      this.logger.debug(`[Spotify] Fetch last liked track for user=${userId}`);
      const { data } = await this.authService.oAuth2ApiRequest<any>(ProviderKeyEnum.Spotify, userId, {
        url: 'https://api.spotify.com/v1/me/tracks',
        method: 'GET',
        params: { limit: 1 },
      });

    const items = data.items;
    if (!items || items.length === 0) {
      // Nothing liked yet: clear cache to a neutral value and report unchanged
      this.logger.debug(`[Spotify] No liked tracks found for user=${userId}`);
      await this.redisService.setValue(cacheKey, '');
      return { code: 1 };
    }

    // Extract track information
    const track = items[0].track;
    const latestTrackId = track?.id || items[0].id;
    const latestAddedAt = items[0].added_at;
    if (!latestTrackId || !latestAddedAt) return { code: 1 };

    // Compare Spotify's latest added_at with the cached value
    const lastStoredAt = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Spotify] Latest track id=${latestTrackId}, added_at=${latestAddedAt}, cached=${lastStoredAt ?? 'none'} for user=${userId}`);

    // First time seeing a liked track - baseline initialization
    if (!lastStoredAt) {
      await this.redisService.setValue(cacheKey, latestAddedAt);
      this.logger.debug(`[Spotify] Baseline initialized for user=${userId}: ${latestTrackId} at ${latestAddedAt}`);
      return { code: 1 };
    }

    // Check if there's a newer like
    if (latestAddedAt > lastStoredAt) {
      // Update cache and signal that a new like has been detected
      await this.redisService.setValue(cacheKey, latestAddedAt);
      this.logger.log(`[Spotify] New like detected for user=${userId}: ${latestTrackId} at ${latestAddedAt}`);

      // Extract track details for placeholders
      const trackData = {
        SPOTIFY_LIKED_SONG_NAME: track?.name || 'Unknown',
        SPOTIFY_LIKED_SONG_ARTIST: track?.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        SPOTIFY_LIKED_SONG_ALBUM: track?.album?.name || 'Unknown',
        SPOTIFY_LIKED_SONG_ALBUM_RELEASE_DATE: track?.album?.release_date || 'Unknown',
        SPOTIFY_LIKED_SONG_DURATION_MS: track?.duration_ms?.toString() || '0',
        SPOTIFY_LIKED_SONG_URL: track?.external_urls?.spotify || '',
        SPOTIFY_LIKED_SONG_ID: latestTrackId,
        SPOTIFY_LIKED_SONG_ADDED_AT: latestAddedAt,
      };

      return { code: 0, data: trackData };
    }

    this.logger.debug(`[Spotify] No new like for user=${userId} (unchanged)`);
    return { code: 1 };
    } catch (error: any) {
      this.logger.error(`[Spotify] Error checking likes for user=${userId}: ${error?.message || error}`);
      // Return 1 (no change) to avoid spamming reactions on transient errors
      return { code: 1 };
    }
  }

  /**
   * Starts an interval that periodically checks for new likes and
   * invokes the provided callback with the ActionResult.
   *
   * @param userId - The user identifier.
   * @param callback - Invoked with ActionResult containing code and track data.
   */
  startPolling(userId: string, callback: (result: ActionResult) => void): void {
    if (this.pollIntervals.has(userId)) return; // Already polling

    // Check every 20 seconds; adjust as needed for system load and latency
    const interval = setInterval(async () => {
      const result = await this.hasNewSpotifyLike(userId);
      callback(result);
    }, 20000);

    this.pollIntervals.set(userId, interval);
  }

  /**
   * Clears and removes the active polling interval for the given user.
   *
   * @param userId - The user identifier.
   */
  stopPolling(userId: string): void {
    const interval = this.pollIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(userId);
    }
  }

  /**
   * Returns the list of placeholders available for this action.
   * These placeholders can be used in reaction configurations.
   */
  getPlaceholders(): ActionPlaceholder[] {
    return [
      {
        key: 'SPOTIFY_LIKED_SONG_NAME',
        description: 'The name of the liked song',
        example: 'Bohemian Rhapsody',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ARTIST',
        description: 'The artist(s) of the liked song',
        example: 'Queen',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ALBUM',
        description: 'The album name of the liked song',
        example: 'A Night at the Opera',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ALBUM_RELEASE_DATE',
        description: 'The release date of the album',
        example: '1975-11-21',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_DURATION_MS',
        description: 'The duration of the song in milliseconds',
        example: '354947',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_URL',
        description: 'The Spotify URL of the liked song',
        example: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ID',
        description: 'The Spotify ID of the liked song',
        example: '4u7EnebtmKWzUH433cf5Qv',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ADDED_AT',
        description: 'The timestamp when the song was liked',
        example: '2025-01-15T10:30:00Z',
      },
    ];
  }
}

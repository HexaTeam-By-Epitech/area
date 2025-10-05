import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import type { PollingAction } from '../../../common/interfaces/area.type';
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
   * @param emit - Callback invoked with the check result: `0` if new like,
   * `1` if no change, `-1` if the provider is not linked.
   */
  start(userId: string, emit: (result: number) => void): void {
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
   * Result semantics:
   * - `0`: a newer like has been detected
   * - `1`: no new like (unchanged)
   * - `-1`: Spotify not linked for this user
   *
   * @param userId - The user identifier.
   * @returns A promise resolving to the result code described above.
   */
  async hasNewSpotifyLike(userId: string): Promise<number> {
    const cacheKey = `spotify:last_like_at:${userId}`;
    // Ensure the user has a linked Spotify account
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Spotify);
    if (!linked) return -1;
  
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
      return 1;
    }
  
    // Extract identifiers and the timestamp at which the track was saved
    const latestTrackId = items[0].track?.id || items[0].id;
    const latestAddedAt = items[0].added_at;
    if (!latestTrackId || !latestAddedAt) return 1;
  
    // Compare Spotify's latest added_at with the cached value
    const lastStoredAt = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Spotify] Latest track id=${latestTrackId}, added_at=${latestAddedAt}, cached=${lastStoredAt ?? 'none'} for user=${userId}`);
  
    if (!lastStoredAt || latestAddedAt > lastStoredAt) {
      // Update cache and signal that a new like has been detected
      await this.redisService.setValue(cacheKey, latestAddedAt);
      this.logger.log(`[Spotify] New like detected for user=${userId}: ${latestTrackId} at ${latestAddedAt}`);
      return 0;
    }
  
    this.logger.debug(`[Spotify] No new like for user=${userId} (unchanged)`);
    return 1;
  }

  /**
   * Starts an interval that periodically checks for new likes and
   * invokes the provided callback with the result code.
   *
   * @param userId - The user identifier.
   * @param callback - Invoked with `0`, `1`, or `-1` depending on the check result.
   */
  startPolling(userId: string, callback: (result: number) => void): void {
    if (this.pollIntervals.has(userId)) return; // Already polling

    // Check every 5 seconds; adjust as needed for system load and latency
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
}

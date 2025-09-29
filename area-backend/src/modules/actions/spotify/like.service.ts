import { Injectable, Logger } from '@nestjs/common';
import { ProviderKey, UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { RedisService } from 'src/modules/redis/redis.service';
import type { PollingAction } from '../polling/ActionPollingService';

@Injectable()
export class SpotifyLikeService implements PollingAction {
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly logger = new Logger(SpotifyLikeService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  // PollingAction interface
  supports(actionName: string): boolean {
    return actionName === 'spotify_has_likes';
  }

  start(userId: string, emit: (result: number) => void): void {
    this.startPolling(userId, emit);
  }

  stop(userId: string): void {
    this.stopPolling(userId);
  }

  async hasNewSpotifyLike(userId: string): Promise<number> {
    const cacheKey = `spotify:last_like_at:${userId}`;
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKey.Spotify);
    if (!linked) return -1;
  
    this.logger.debug(`[Spotify] Fetch last liked track for user=${userId}`);
    const { data } = await this.authService.oAuth2ApiRequest<any>(ProviderKey.Spotify, userId, {
      url: 'https://api.spotify.com/v1/me/tracks',
      method: 'GET',
      params: { limit: 1 },
    });
  
    const items = data.items;
    if (!items || items.length === 0) {
      this.logger.debug(`[Spotify] No liked tracks found for user=${userId}`);
      await this.redisService.setValue(cacheKey, '');
      return 1;
    }
  
    const latestTrackId = items[0].track?.id || items[0].id;
    const latestAddedAt = items[0].added_at;
    if (!latestTrackId || !latestAddedAt) return 1;
  
    const lastStoredAt = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Spotify] Latest track id=${latestTrackId}, added_at=${latestAddedAt}, cached=${lastStoredAt ?? 'none'} for user=${userId}`);
  
    if (!lastStoredAt || latestAddedAt > lastStoredAt) {
      await this.redisService.setValue(cacheKey, latestAddedAt);
      this.logger.log(`[Spotify] New like detected for user=${userId}: ${latestTrackId} at ${latestAddedAt}`);
      return 0;
    }
  
    this.logger.debug(`[Spotify] No new like for user=${userId} (unchanged)`);
    return 1;
  }

  startPolling(userId: string, callback: (result: number) => void): void {
    if (this.pollIntervals.has(userId)) return; // Already polling

    const interval = setInterval(async () => {
      const result = await this.hasNewSpotifyLike(userId);
      callback(result);
    }, 5000);

    this.pollIntervals.set(userId, interval);
  }

  stopPolling(userId: string): void {
    const interval = this.pollIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(userId);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ProviderKey, UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class SpotifyLikeService {
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  async hasNewSpotifyLike(userId: string): Promise<number> {
    const cacheKey = `spotify:last_like:${userId}`;
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKey.Spotify);
    if (!linked) return -1;

    const { data } = await this.authService.oAuth2ApiRequest<any>(ProviderKey.Spotify, userId, {
      url: 'https://api.spotify.com/v1/me/tracks',
      method: 'GET',
      params: { limit: 1 },
    });

    const items = data.items;
    if (!items || items.length === 0) {
      await this.redisService.setValue(cacheKey, '');
      return 1;
    }

    const latestTrackId = items[0].track?.id || items[0].id;
    if (!latestTrackId) return 1;

    const lastStoredId = await this.redisService.getValue(cacheKey);

    if (lastStoredId !== latestTrackId) {
      await this.redisService.setValue(cacheKey, latestTrackId);
      return 0;
    }
    return 1;
  }

  startPolling(userId: string, callback: (result: number) => void): void {
    if (this.pollIntervals.has(userId)) return; // Already polling

    const interval = setInterval(async () => {
      const result = await this.hasNewSpotifyLike(userId);
      callback(result);
    }, 10000);

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

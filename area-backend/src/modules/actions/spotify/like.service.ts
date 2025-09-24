import { Injectable } from '@nestjs/common';
import { ProviderKey, UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class SpotifyLikeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Checks if the user has a new liked track on Spotify since last poll.
   * Stores the last liked track ID in Redis and compares on each poll.
   * Returns:
   *   0 if a new like is detected
   *   1 if no new like
   *  -1 if no Spotify account or token
   */
  async hasNewSpotifyLike(userId: string): Promise<number> {
  const cacheKey = `spotify:last_like:${userId}`;

    // Ensure user has a linked Spotify account
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKey.Spotify);
    if (!linked) {
      return -1; // No Spotify account linked
    }

    // Poll Spotify API for the most recent liked track using auto-refresh helper
    const { data } = await this.authService.spotifyApiRequest<any>(userId, {
      url: 'https://api.spotify.com/v1/me/tracks',
      method: 'GET',
      params: { limit: 1 },
    });

    const items = data.items;
    if (!items || items.length === 0) {
      // No likes at all
    await this.redisService.setValue(cacheKey, '');
      return 1;
    }

    const latestTrackId = items[0].track?.id || items[0].id;
    if (!latestTrackId) {
      return 1;
    }

    // Get last stored liked track ID
    const lastStoredId = await this.redisService.getValue(cacheKey);

    if (lastStoredId !== latestTrackId) {
      // New like detected
    await this.redisService.setValue(cacheKey, latestTrackId);
      return 0;
    }
    // No new like
    return 1;
  }
}


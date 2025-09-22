import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { RedisService } from 'src/modules/redis/redis.service';
import axios from 'axios';

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

    // Get user's Spotify OAuth tokens
    const oauth = await this.usersService.findUserOAuthAccount(userId, 'spotify');
    if (!oauth) {
      return -1; // No Spotify account linked
    }
    const token = this.authService.decrypt(oauth.access_token || '');
    if (!token) {
      return -1; // No Spotify token
    }

    // Poll Spotify API for the most recent liked track
    const response = await axios.get('https://api.spotify.com/v1/me/tracks?limit=1', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const items = response.data.items;
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

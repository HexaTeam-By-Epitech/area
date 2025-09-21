import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import axios from 'axios';

@Injectable()
export class LikeService {
  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  async hasSpotifyLikes(userId: string): Promise<boolean> {
    const cacheKey = `spotify:likes:${userId}`;
    const cached = await this.redisService.getVerificationCode(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    // Get user's Spotify OAuth tokens
    const oauth = await this.usersService.findUserOAuthAccount(userId, 'google');
    if (!oauth || !oauth.access_token) {
      return false;
    }

    // Poll Spotify API for liked tracks
    const response = await axios.get('https://api.spotify.com/v1/me/tracks?limit=1', {
      headers: {
        Authorization: `Bearer ${oauth.access_token}`,
      },
    });

    const hasLikes = response.data.items && response.data.items.length > 0;
    // Cache result for 60 seconds
    await this.redisService.setVerificationCode(cacheKey, hasLikes ? 'true' : 'false', 60);

    return hasLikes;
  }
}

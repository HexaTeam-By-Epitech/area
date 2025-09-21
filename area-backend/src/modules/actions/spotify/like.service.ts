import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import axios from 'axios';

@Injectable()
export class SpotifyLikeService {
  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  async hasSpotifyLikes(userId: string): Promise<number> {
    const cacheKey = `spotify:likes:${userId}`;

    // Get user's Spotify OAuth tokens
    const oauth = await this.usersService.findUserOAuthAccount(userId, 'spotify');
    if (!oauth || !oauth.access_token) {
      return -1; // No Spotify account linked
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

    return (hasLikes) ? 0 : 1; // 0 if user has likes, 1 if no likes
  }
} // -1 = missing token, 0 = has likes, 1 = no likes

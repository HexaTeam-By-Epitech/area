import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/modules/redis/redis.service';
import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import axios from 'axios';

@Injectable()
export class SpotifyLikeService {
  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async hasSpotifyLikes(userId: string): Promise<number> {
    const cacheKey = `spotify:likes:${userId}`;

    // Get user's Spotify OAuth tokens
    const oauth = await this.usersService.findUserOAuthAccount(userId, 'spotify');
    if (!oauth) {
      return -1; // No Spotify account linked
    }
    const token = this.authService.decrypt(oauth.access_token || '');
    if (!token) {
      return -1; // No Spotify account linked
    }
    // Poll Spotify API for liked tracks
    const response = await axios.get('https://api.spotify.com/v1/me/tracks?limit=1', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const hasLikes = response.data.items && response.data.items.length > 0;
    // Cache result for 60 seconds
    await this.redisService.setVerificationCode(cacheKey, hasLikes ? 'true' : 'false', 60);

    const result = (hasLikes) ? 0 : 1; 
    console.log(result);
    return result; // 0 if user has likes, 1 if no likes
  }
} // -1 = missing token, 0 = has likes, 1 = no likes

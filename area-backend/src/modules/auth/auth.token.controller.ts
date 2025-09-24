import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth - Token Refresh')
@Controller('auth')
export class AuthTokenController {
  constructor(private authService: AuthService) {}

  @Post('google/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh Google access token using stored refresh token' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  async refreshGoogleAccess(@Body('userId') userId: string) {
    const tokenInfo = await this.authService.refreshGoogleAccessToken(userId);
    return { message: 'Refreshed', ...tokenInfo };
  }

  @Post('spotify/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh Spotify access token using stored refresh token' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  async refreshSpotifyAccess(@Body('userId') userId: string) {
    const tokenInfo = await this.authService.refreshSpotifyAccessToken(userId);
    return { message: 'Refreshed', ...tokenInfo };
  }
}

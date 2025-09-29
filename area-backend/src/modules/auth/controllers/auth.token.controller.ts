import { Controller, Post, Param, Body, HttpCode } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth.service';

/**
 * Controller exposing token refresh endpoints for any registered provider.
 *
 * Uses stored refresh tokens to obtain a new access token from the provider.
 */
@ApiTags('Auth - Token Refresh (Generic)')
@Controller('auth')
export class GenericAuthTokenController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Refreshes the provider access token for a given `userId` using the stored
   * refresh token, if present.
   *
   * @param provider - The provider key (e.g. `google`, `spotify`).
   * @param userId - The application user identifier.
   * @returns The refreshed access token and its expiration in seconds.
   */
  @Post(':provider/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh provider access token using stored refresh token' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  async refresh(@Param('provider') provider: string, @Body('userId') userId: string) {
    // Delegate to AuthService to handle provider-specific refresh logic
    const { accessToken, expiresIn } = await this.auth.refreshAccessToken(provider, userId);
    return { message: 'Refreshed', accessToken, expiresIn };
  }
}

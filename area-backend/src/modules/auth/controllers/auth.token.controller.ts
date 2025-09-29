import { Controller, Post, Param, Body, HttpCode } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth.service';

@ApiTags('Auth - Token Refresh (Generic)')
@Controller('auth')
export class GenericAuthTokenController {
  constructor(private readonly auth: AuthService) {}

  @Post(':provider/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh provider access token using stored refresh token' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  async refresh(@Param('provider') provider: string, @Body('userId') userId: string) {
    const { accessToken, expiresIn } = await this.auth.refreshAccessToken(provider, userId);
    return { message: 'Refreshed', accessToken, expiresIn };
  }
}

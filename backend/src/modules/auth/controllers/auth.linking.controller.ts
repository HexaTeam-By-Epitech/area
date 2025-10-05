import { Controller, Get, Post, Res, Param, Query, Body, HttpCode, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../../../common/decorators/public.decorator';
import { GetUser, JwtPayload } from '../../../common/decorators/get-user.decorator';

@ApiTags('Auth - Linking (Generic)')
@ApiBearerAuth('JWT-auth')
@Controller('auth')
export class GenericAuthLinkingController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Get list of available OAuth providers for linking' })
  @ApiResponse({ status: 200, description: 'Returns array of provider keys', schema: { properties: { providers: { type: 'array', items: { type: 'string' } } } } })
  getAvailableProviders() {
    return { providers: this.auth.listProviders() };
  }

  @Get('linked-providers')
  @ApiOperation({ summary: 'Get list of linked providers for authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns array of linked provider names' })
  async getLinkedProviders(@GetUser('sub') userId: string) {
    return this.auth.getLinkedProviders(userId);
  }

  @Get(':provider/url')
  @ApiOperation({ summary: 'Get OAuth URL for provider linking (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Returns the OAuth URL', schema: { properties: { url: { type: 'string' } } } })
  getAuthUrl(
    @Param('provider') provider: string,
    @GetUser('sub') userId: string,
  ) {
    const url = this.auth.buildAuthUrl(provider, { userId });
    return { url };
  }

  @Get(':provider')
  @ApiOperation({ summary: 'Start provider OAuth for linking (Authenticated)' })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async startOAuth(
    @Res() res: express.Response,
    @Param('provider') provider: string,
    @GetUser('sub') userId: string,
  ) {
    const url = this.auth.buildAuthUrl(provider, { userId });
    return res.redirect(url);
  }

  @Public()
  @Get(':provider/callback')
  @ApiOperation({ summary: 'Generic OAuth callback (Public - handles state validation internally)' })
  @ApiResponse({ status: 302, description: 'OAuth flow successful - redirects to frontend' })
  async callback(
    @Res() res: express.Response,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    try {
      const result = await this.auth.handleOAuthCallback(provider, code, state);
      // Redirect to frontend with success message
      const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/home/services?provider=${provider}&status=success`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      const errorMessage = error instanceof Error ? error.message : 'OAuth linking failed';
      return res.redirect(`${frontendUrl}/home/services?provider=${provider}&status=error&message=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Delete(':provider/link')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unlink a provider from authenticated user account' })
  @ApiResponse({ status: 200, description: 'Provider unlinked' })
  async unlink(
    @Param('provider') provider: string,
    @GetUser('sub') userId: string,
  ) {
    return this.auth.unlinkProvider(provider as any, userId);
  }
}

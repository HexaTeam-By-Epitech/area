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
  @ApiResponse({ status: 200, description: 'OAuth flow successful' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    return this.auth.handleOAuthCallback(provider, code, state);
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

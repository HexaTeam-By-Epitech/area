import { Controller, Get, Post, Res, Param, Query, Body, HttpCode, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';

@ApiTags('Auth - Linking (Generic)')
@Controller('auth')
export class GenericAuthLinkingController {
  constructor(private readonly auth: AuthService) {}

  @Get(':provider/url')
  @ApiOperation({ summary: 'Get OAuth URL for provider linking (Swagger friendly)' })
  @ApiResponse({ status: 200, description: 'Returns the OAuth URL', schema: { properties: { url: { type: 'string' } } } })
  getAuthUrl(
    @Param('provider') provider: string,
    @Query('userId') userId: string,
  ) {
    const url = this.auth.buildAuthUrl(provider, { userId });
    return { url };
  }

  @Get(':provider')
  @ApiOperation({ summary: 'Start provider OAuth for linking' })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async startOAuth(
    @Res() res: express.Response,
    @Param('provider') provider: string,
    @Query('userId') userId: string,
  ) {
    const url = this.auth.buildAuthUrl(provider, { userId });
    return res.redirect(url);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'Generic OAuth callback' })
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
  @ApiOperation({ summary: 'Unlink a provider from a user account' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'Provider unlinked' })
  async unlink(
    @Param('provider') provider: string,
    @Body('userId') userId: string,
  ) {
    return this.auth.unlinkProvider(provider as any, userId);
  }
}

import { Controller, Get, Post, Res, Body, Param, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';

@ApiTags('Auth - Identity (Generic)')
@Controller('auth')
export class GenericAuthIdentityController {
  constructor(private readonly auth: AuthService) {}

  @Post(':provider/id-token')
  @ApiOperation({ summary: 'Sign-in with provider ID token (e.g., Google One Tap)' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async loginWithIdToken(@Param('provider') provider: string, @Body('token') token: string) {
    return this.auth.signInWithIdToken(provider, token);
  }

  @Get(':provider/login')
  @ApiOperation({ summary: 'Start provider OAuth login (code flow), if supported' })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async startLogin(@Res() res: express.Response, @Param('provider') provider: string) {
    const url = this.auth.buildLoginUrl(provider);
    return res.redirect(url);
  }

  @Get(':provider/login/callback')
  @ApiOperation({ summary: 'Provider login callback (code flow)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async loginCallback(@Param('provider') provider: string, @Query('code') code: string, @Query('state') state?: string) {
    return this.auth.handleLoginCallback(provider, code, state);
  }
}

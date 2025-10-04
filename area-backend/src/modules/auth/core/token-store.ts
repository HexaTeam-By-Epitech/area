import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import type { ProviderKeyEnum } from 'src/common/interfaces/oauth2.type';
import type { ProviderKey } from '../../../common/interfaces/oauth2.type';
import type { TokenRecord, TokenStore } from '../../../common/interfaces/crypto.type';


@Injectable()
export class PrismaTokenStore implements TokenStore {
  constructor(private readonly users: UsersService) {}

  /**
   * Retrieve a linked account's raw encrypted tokens for a user/provider.
   */
  async getLinkedAccount(userId: string, provider: ProviderKey) {
    const row = await this.users.findLinkedAccount(userId, provider as ProviderKeyEnum);
    if (!row) return null;
    return {
      access_token: row.access_token ?? undefined,
      refresh_token: row.refresh_token ?? undefined,
    };
  }

  /**
   * Update linked account tokens for a user/provider.
   */
  async updateLinkedTokens(userId: string, provider: ProviderKey, tokens: TokenRecord): Promise<void> {
    await this.users.updateLinkedTokens(userId, provider as ProviderKeyEnum, {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
    });
  }

  /**
   * Upsert a login identity and return the application user.
   */
  async upsertIdentityForLogin(input: {
    provider: ProviderKey;
    providerUserId: string;
    email: string;
    name?: string | undefined;
    avatarUrl?: string | undefined;
    userId?: string | undefined;
  }): Promise<{ id: string; email: string }> {
    return this.users.upsertIdentityForLogin({
      provider: input.provider as ProviderKeyEnum,
      providerUserId: input.providerUserId,
      email: input.email,
      name: input.name,
      avatarUrl: input.avatarUrl,
      userId: input.userId,
    });
  }

  /**
   * Find an application user by id.
   */
  async findById(userId: string): Promise<{ id: string; email: string } | null> {
    return this.users.findById(userId);
  }

  /**
   * Link an external account to an existing user.
   */
  async linkExternalAccount(input: {
    userId: string;
    provider: ProviderKey;
    providerUserId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    scopes?: string | null;
  }): Promise<{ id: string; email: string }> {
    const user = await (this.users as any).linkExternalAccount({
      userId: input.userId,
      provider: input.provider as ProviderKeyEnum,
      providerUserId: input.providerUserId,
      accessToken: input.accessToken ?? null,
      refreshToken: input.refreshToken ?? null,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      scopes: input.scopes ?? null,
    });
    return { id: user.id, email: user.email };
  }
}

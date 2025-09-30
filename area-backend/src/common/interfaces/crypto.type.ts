import type { ProviderKey } from './oauth2.type';

/**
 * Abstraction for encrypting and decrypting tokens for secure storage.
 */
export interface TokenCrypto {
  encrypt(plain: string): string;
  decrypt(b64: string): string;
}

/**
 * Token records used to persist provider tokens and their expiration.
 */
export interface TokenRecord {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
}

/**
 * Abstraction over persistence for identities and linked accounts.
 */
export interface TokenStore {
  getLinkedAccount(userId: string, provider: ProviderKey): Promise<{ access_token?: string; refresh_token?: string } | null>;
  updateLinkedTokens(userId: string, provider: ProviderKey, tokens: TokenRecord): Promise<void>;
  upsertIdentityForLogin(input: {
    provider: ProviderKey;
    providerUserId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ id: string; email: string }>;
  findById(userId: string): Promise<{ id: string; email: string } | null>;
  linkExternalAccount(input: {
    userId: string;
    provider: ProviderKey;
    providerUserId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    scopes?: string | null;
  }): Promise<{ id: string; email: string }>;
}

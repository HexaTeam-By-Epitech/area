import type { AxiosRequestConfig } from 'axios';

/**
 * Canonical provider identifier used across identity and linking flows.
 * Known built-ins: 'google', 'spotify'. Custom strings are allowed for extensibility.
 */
export type ProviderKey = 'google' | 'spotify' | (string & {});

export enum ProviderKeyEnum {
    Google = 'google',
    Spotify = 'spotify',
}

/**
 * Pluggable identity provider interface for login flows.
 * Implementations may optionally support ID token login and/or code login.
 */
export interface IdentityProvider {
  key: ProviderKey;
  /** Optional: One-tap / ID token login path. */
  signInWithIdToken?(idToken: string): Promise<{ userId: string; email: string }>; // Optional
  /** Optional: Build an authorization URL to start a code login flow. */
  buildLoginUrl?(): string; // Optional
  /** Optional: Handle the code login callback and return user identity. */
  handleLoginCallback?(code: string, state?: string): Promise<{ userId: string; email: string }>; // Optional
}

/**
 * Pluggable linking provider interface for connecting external OAuth2 accounts
 * to an existing application user (stores access/refresh tokens).
 */
export interface LinkingProvider {
  key: ProviderKey;
  buildLinkUrl(params: { userId: string; scopes?: string[] }): string;
  handleLinkCallback(code: string, state?: string): Promise<{ userId: string }>;
  refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }>;
  getCurrentAccessToken(userId: string): Promise<string>;
}

/**
 * Abstraction for making OAuth2-related API requests (e.g., token endpoints).
 */
export interface OAuth2ApiClient {
  request<T>(
    provider: ProviderKey,
    userId: string,
    config: AxiosRequestConfig
  ): Promise<{ data: T; status: number }>;
}

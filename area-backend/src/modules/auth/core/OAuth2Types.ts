import type { AxiosRequestConfig } from 'axios';

export type ProviderKey = 'google' | 'spotify' | (string & {});

export interface IdentityProvider {
  key: ProviderKey;
  signInWithIdToken?(idToken: string): Promise<{ userId: string; email: string }>; // Optional
  buildLoginUrl?(): string; // Optional
  handleLoginCallback?(code: string, state?: string): Promise<{ userId: string; email: string }>; // Optional
}

export interface LinkingProvider {
  key: ProviderKey;
  buildLinkUrl(params: { userId: string; scopes?: string[] }): string;
  handleLinkCallback(code: string, state?: string): Promise<{ userId: string }>;
  refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }>;
  getCurrentAccessToken(userId: string): Promise<string>;
}

export interface OAuth2ApiClient {
  request<T>(
    provider: ProviderKey,
    userId: string,
    config: AxiosRequestConfig
  ): Promise<{ data: T; status: number }>;
}

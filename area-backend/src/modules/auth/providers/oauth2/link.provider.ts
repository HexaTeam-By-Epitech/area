export interface OAuth2LinkProvider {
  /** Build OAuth authorization URL for linking a provider to an existing user. */
  buildAuthUrl(userId: string, scopesCsv?: string): string;

  /** Handle OAuth linking callback (exchanges code, stores tokens into linked_accounts). */
  handleLinkCallback(code: string, state?: string): Promise<{ userId: string; provider: string }>;
}

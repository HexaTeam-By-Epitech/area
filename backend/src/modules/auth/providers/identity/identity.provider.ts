/**
 * Interface for identity login providers (OAuth/OIDC) that perform authentication
 * and return an application access token together with user identity.
 */
export interface IdentityProvider {
  /**
   * Build the Authorization Code flow URL for login (redirect-based).
   * @returns The URL to redirect the user to for login.
   */
  buildAuthUrl(): string;

  /**
   * Handle Authorization Code flow callback for login.
   * @param code The authorization code returned by the identity provider.
   * @returns A promise that resolves with an object containing the access token,
   * user ID and email address.
   */
  handleLoginCallback(code: string): Promise<{ accessToken: string; userId: string; email: string }>;

  /**
   * Optional: One Tap / ID token flow (frontend obtains id_token).
   * @param idToken The ID token returned by the identity provider.
   * @returns A promise that resolves with an object containing the access token,
   * user ID and email address.
   */
  signInWithIdToken?(idToken: string): Promise<{ accessToken: string; userId: string; email: string }>;
}

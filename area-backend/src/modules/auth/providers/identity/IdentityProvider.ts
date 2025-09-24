import { AxiosRequestConfig } from 'axios';

export interface IdentityProvider {
  // Build the Authorization Code flow URL for login (redirect-based)
  buildAuthUrl(): string;

  // Handle Authorization Code flow callback for login
  handleLoginCallback(code: string): Promise<{ accessToken: string; userId: string; email: string }>; 

  // Optional: One Tap / ID token flow (frontend obtains id_token)
  signInWithIdToken?(idToken: string): Promise<{ accessToken: string; userId: string; email: string }>;
}

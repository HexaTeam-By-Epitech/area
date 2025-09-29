import { Injectable } from '@nestjs/common';

/**
 * Minimal HTTP client helper for OAuth2 token endpoints (form-encoded POSTs).
 */
@Injectable()
export class OAuth2Client {
  /**
   * POST a URL-encoded form to a given endpoint.
   * @param url - Target endpoint URL
   * @param body - Form fields
   * @param headers - Optional additional headers (e.g., Authorization)
   * @throws Error when the HTTP response is not OK
   */
  async postForm(url: string, body: Record<string, string>, headers?: Record<string, string>) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(headers || {}),
      },
      body: new URLSearchParams(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`);
    }
    return resp.json();
  }
}

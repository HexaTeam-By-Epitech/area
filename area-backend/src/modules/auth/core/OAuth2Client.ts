import { Injectable } from '@nestjs/common';

@Injectable()
export class OAuth2Client {
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

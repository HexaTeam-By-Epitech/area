import * as crypto from 'crypto';

/**
 * Lightweight AES-GCM token crypto utility used by provider implementations.
 * Key is derived from a caller-supplied secret (e.g., TOKENS_ENC_KEY).
 */
export class TokenCryptoUtil {
  private readonly encKey: Buffer;

  constructor(secret: string) {
    if (!secret) throw new Error('TOKENS_ENC_KEY missing');
    this.encKey = crypto.createHash('sha256').update(secret, 'utf8').digest();
  }

  /**
   * Encrypt a UTF-8 string and return base64 payload with version header.
   */
  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const version = Buffer.from([1]);
    return Buffer.concat([version, iv, tag, ciphertext]).toString('base64');
  }

  /**
   * Decrypt a base64 payload produced by `encrypt`. Throws for unsupported format.
   */
  decrypt(b64: string): string {
    const data = Buffer.from(b64, 'base64');
    if (data.length >= 1 + 12 + 16 && data[0] === 1) {
      const iv = data.subarray(1, 1 + 12);
      const tag = data.subarray(1 + 12, 1 + 12 + 16);
      const ciphertext = data.subarray(1 + 12 + 16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    }
    throw new Error('Unsupported token format');
  }
}

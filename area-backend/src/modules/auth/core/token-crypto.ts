import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenCrypto } from 'src/common/interfaces/crypto.type';
import * as crypto from 'crypto';

/**
 * AES-GCM based token encrypter/decrypter used to protect provider tokens at rest.
 *
 * Uses a key derived from `TOKENS_ENC_KEY`. Includes a small legacy fallback for
 * older XOR-based format to maintain backward compatibility during migrations.
 */
@Injectable()
export class AesGcmTokenCrypto implements TokenCrypto {
  constructor(private readonly config: ConfigService) {}

  private get encKey(): Buffer {
    const secret = this.config.get<string>('TOKENS_ENC_KEY');
    if (!secret) throw new InternalServerErrorException('TOKENS_ENC_KEY missing');
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
  }

  // AES-256-GCM encryption. Output format (base64): [1-byte version=1][12-byte IV][16-byte TAG][ciphertext]
  /**
   * Encrypt a UTF-8 string and return a base64-encoded payload with version header.
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
   * Decrypt a base64-encoded payload produced by `encrypt`. Falls back to legacy
   * XOR format if version header is not present.
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
    // Legacy fallback: XOR with raw TOKENS_ENC_KEY, base64-encoded
    const legacySecret = this.config.get<string>('TOKENS_ENC_KEY');
    if (!legacySecret) throw new InternalServerErrorException('TOKENS_ENC_KEY missing');
    const key = Buffer.from(legacySecret);
    const buf = data;
    const out = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
    return out.toString('utf8');
  }
}

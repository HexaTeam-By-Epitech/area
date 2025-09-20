import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis service for cache and temporary verification codes management
 * Manages Redis connection and provides methods to store/retrieve data with expiration
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  /**
   * Initialize Redis connection on module startup
   */
  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  /**
   * Close Redis connection on module shutdown
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Store a verification code with automatic expiration
   * @param key - Unique key to identify the code (usually the email)
   * @param code - 6-digit verification code
   * @param expirationSeconds - Expiration duration in seconds (default: 600 = 10 minutes)
   */
  async setVerificationCode(
    key: string,
    code: string,
    expirationSeconds: number = 600,
  ): Promise<void> {
    await this.client.setEx(key, expirationSeconds, code);
  }

  /**
   * Retrieve a verification code from Redis
   * @param key - Unique key to identify the code
   * @returns The verification code or null if not found/expired
   */
  async getVerificationCode(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete a verification code from Redis
   * @param key - Unique key to identify the code
   */
  async deleteVerificationCode(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if a key exists in Redis
   * @param key - Key to check
   * @returns true if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Get the remaining time to live of a key in seconds
   * @param key - Key to check
   * @returns Remaining time to live in seconds, -1 if key doesn't exist, -2 if no expiration
   */
  async getTtl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
}

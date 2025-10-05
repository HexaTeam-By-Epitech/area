import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../src/modules/redis/redis.service';
import { createClient, RedisClientType } from 'redis';

// Mock Redis client
const mockRedisClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
};

// Mock createClient
jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient),
}));

describe('RedisService', () => {
    let service: RedisService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RedisService],
        }).compile();

        service = module.get<RedisService>(RedisService);
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should connect to Redis on module initialization', async () => {
            await service.onModuleInit();

            expect(mockRedisClient.connect).toHaveBeenCalled();
            expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('onModuleDestroy', () => {
        it('should disconnect from Redis on module destruction', async () => {
            // Simulate an existing connection
            (service as any).client = mockRedisClient;

            await service.onModuleDestroy();

            expect(mockRedisClient.disconnect).toHaveBeenCalled();
        });

        it('should handle case when client is not initialized', async () => {
            // Do not initialize the client
            (service as any).client = null;

            await expect(service.onModuleDestroy()).resolves.not.toThrow();
        });
    });

    describe('setVerificationCode', () => {
        beforeEach(async () => {
            await service.onModuleInit();
        });

        it('should store verification code with expiration', async () => {
            const key = 'verification:test@example.com';
            const code = '123456';
            const expirationSeconds = 600;

            await service.setVerificationCode(key, code, expirationSeconds);

            expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, expirationSeconds, code);
        });

        it('should use default expiration of 600 seconds', async () => {
            const key = 'verification:test@example.com';
            const code = '123456';

            await service.setVerificationCode(key, code);

            expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, 600, code);
        });
    });

    describe('getVerificationCode', () => {
        beforeEach(async () => {
            await service.onModuleInit();
        });

        it('should retrieve verification code', async () => {
            const key = 'verification:test@example.com';
            const expectedCode = '123456';

            mockRedisClient.get.mockResolvedValue(expectedCode);

            const result = await service.getVerificationCode(key);

            expect(mockRedisClient.get).toHaveBeenCalledWith(key);
            expect(result).toBe(expectedCode);
        });

        it('should return null when code does not exist', async () => {
            const key = 'verification:test@example.com';

            mockRedisClient.get.mockResolvedValue(null);

            const result = await service.getVerificationCode(key);

            expect(result).toBeNull();
        });
    });

    describe('deleteVerificationCode', () => {
        beforeEach(async () => {
            await service.onModuleInit();
        });

        it('should delete verification code', async () => {
            const key = 'verification:test@example.com';

            await service.deleteVerificationCode(key);

            expect(mockRedisClient.del).toHaveBeenCalledWith(key);
        });
    });

    describe('exists', () => {
        beforeEach(async () => {
            await service.onModuleInit();
        });

        it('should return true when key exists', async () => {
            const key = 'verification:test@example.com';

            mockRedisClient.exists.mockResolvedValue(1);

            const result = await service.exists(key);

            expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
            expect(result).toBe(true);
        });

        it('should return false when key does not exist', async () => {
            const key = 'verification:test@example.com';

            mockRedisClient.exists.mockResolvedValue(0);

            const result = await service.exists(key);

            expect(result).toBe(false);
        });
    });

    describe('getTtl', () => {
        beforeEach(async () => {
            await service.onModuleInit();
        });

        it('should return TTL in seconds', async () => {
            const key = 'verification:test@example.com';
            const expectedTtl = 300;

            mockRedisClient.ttl.mockResolvedValue(expectedTtl);

            const result = await service.getTtl(key);

            expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
            expect(result).toBe(expectedTtl);
        });

        it('should return -1 when key does not exist', async () => {
            const key = 'verification:test@example.com';

            mockRedisClient.ttl.mockResolvedValue(-1);

            const result = await service.getTtl(key);

            expect(result).toBe(-1);
        });

        it('should return -2 when key has no expiration', async () => {
            const key = 'verification:test@example.com';

            mockRedisClient.ttl.mockResolvedValue(-2);

            const result = await service.getTtl(key);

            expect(result).toBe(-2);
        });
    });
});

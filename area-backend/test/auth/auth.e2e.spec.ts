import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { faker } from '@faker-js/faker';
import { RedisService } from '../../src/modules/redis/redis.service';
import { EmailService } from '../../src/modules/email/email.service';

// Mock Redis Service
const mockRedisService = {
    setVerificationCode: jest.fn(),
    getVerificationCode: jest.fn(),
    deleteVerificationCode: jest.fn(),
    exists: jest.fn(),
    getTtl: jest.fn(),
};

// Mock Email Service
const mockEmailService = {
    generateVerificationCode: jest.fn(),
    sendVerificationEmail: jest.fn(),
    verifyConnection: jest.fn(),
};

describe('Auth e2e', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(RedisService)
            .useValue(mockRedisService)
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock for Redis and Email methods
        mockEmailService.generateVerificationCode.mockReturnValue('123456');
        mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
        mockRedisService.setVerificationCode.mockResolvedValue(undefined);
        mockRedisService.deleteVerificationCode.mockResolvedValue(undefined);
    });

    it('/auth/register + /auth/verify-email + /auth/login (success)', async () => {
        const email = faker.internet.email();
        const password = 'SuperSecret123';
        const verificationCode = '123456';

        // Register
        const reg = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(201);
        expect(reg.body.userId).toBeDefined();
        expect(reg.body.message).toContain('User registered successfully');

        // Mock Redis to return verification code
        mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);

        // Verify email
        const verify = await request(app.getHttpServer())
            .post('/auth/verify-email')
            .send({ email, verificationCode })
            .expect(201);
        expect(verify.body.message).toBe('Email verified successfully');

        // Login
        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password })
            .expect(201);
        expect(login.body.userId).toBeDefined();
    });

    it('/auth/login should fail for unverified user', async () => {
        const email = faker.internet.email();
        const password = 'SuperSecret123';

        // Register
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(201);

        // Login should fail
        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password })
            .expect(401);
        expect(login.body.message).toContain('Account not verified');
    });

    it('/auth/register (duplicate)', async () => {
        const email = faker.internet.email();
        const password = 'SuperSecret123';

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(201);

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(409);
    });
});

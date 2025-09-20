import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { faker } from '@faker-js/faker';
import { RedisService } from '../../src/modules/redis/redis.service';
import { EmailService } from '../../src/modules/email/email.service';

describe('Auth Email Verification e2e', () => {
    let app: INestApplication;
    let redisService: RedisService;
    let emailService: EmailService;

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
        redisService = moduleFixture.get<RedisService>(RedisService);
        emailService = moduleFixture.get<EmailService>(EmailService);
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

    describe('POST /auth/register', () => {
        it('should register user and send verification email', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';

            const response = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            expect(response.body.message).toContain('User registered successfully');
            expect(response.body.userId).toBeDefined();

            // Vérifier que les services ont été appelés
            expect(mockEmailService.generateVerificationCode).toHaveBeenCalled();
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(email, '123456');
            expect(mockRedisService.setVerificationCode).toHaveBeenCalledWith(
                `verification:${email}`,
                '123456',
                600
            );
        });

        it('should not allow duplicate email registration', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';

            // Premier enregistrement
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Second registration with the same email
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(409);
        });
    });

    describe('POST /auth/verify-email', () => {
        it('should verify email with correct code', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';

            // Enregistrer l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Mock Redis to return the correct code
            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);

            const response = await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(201);

            expect(response.body.message).toBe('Email verified successfully');

            // Vérifier que le code a été supprimé de Redis
            expect(mockRedisService.deleteVerificationCode).toHaveBeenCalledWith(
                `verification:${email}`
            );
        });

        it('should reject verification with incorrect code', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';
            const wrongCode = '654321';

            // Enregistrer l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Mock Redis to return the correct code
            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);

            const response = await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode: wrongCode })
                .expect(400);

            expect(response.body.message).toBe('Incorrect verification code');
        });

        it('should reject verification with expired code', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';

            // Enregistrer l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Mock Redis to return null (expired code)
            mockRedisService.getVerificationCode.mockResolvedValue(null);

            const response = await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(400);

            expect(response.body.message).toBe('Verification code expired or invalid');
        });

        it('should reject verification for non-existent user', async () => {
            const email = faker.internet.email();
            const verificationCode = '123456';

            // Mock Redis to return the code
            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);

            const response = await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(404);

            expect(response.body.message).toBe('User not found');
        });
    });

    describe('POST /auth/resend-verification', () => {
        it('should resend verification email for unverified user', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';

            // Enregistrer l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            const response = await request(app.getHttpServer())
                .post('/auth/resend-verification')
                .send({ email })
                .expect(201);

            expect(response.body.message).toBe('Verification email sent successfully');

            // Verify that services were called again
            expect(mockEmailService.generateVerificationCode).toHaveBeenCalledTimes(2); // Once for register, once for resend
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(2);
            expect(mockRedisService.setVerificationCode).toHaveBeenCalledTimes(2);
        });

        it('should reject resend for non-existent user', async () => {
            const email = faker.internet.email();

            const response = await request(app.getHttpServer())
                .post('/auth/resend-verification')
                .send({ email })
                .expect(404);

            expect(response.body.message).toBe('User not found');
        });

        it('should reject resend for already verified user', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';

            // Enregistrer et vérifier l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);
            await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(201);

            // Essayer de renvoyer le code
            const response = await request(app.getHttpServer())
                .post('/auth/resend-verification')
                .send({ email })
                .expect(400);

            expect(response.body.message).toBe('This account is already verified');
        });
    });

    describe('POST /auth/login', () => {
        it('should reject login for unverified user', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';

            // Enregistrer l'utilisateur (non vérifié)
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Essayer de se connecter
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password })
                .expect(401);

            expect(response.body.message).toBe('Account not verified. Please check your email for verification code.');
        });

        it('should allow login for verified user', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';

            // Enregistrer l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            // Vérifier l'email
            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);
            await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(201);

            // Se connecter
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password })
                .expect(201);

            expect(response.body.message).toBe('Login successful');
            expect(response.body.userId).toBeDefined();
        });

        it('should reject login with invalid credentials', async () => {
            const email = faker.internet.email();
            const password = 'SuperSecret123';
            const verificationCode = '123456';
            const wrongPassword = 'WrongPassword123';

            // Enregistrer et vérifier l'utilisateur
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email, password })
                .expect(201);

            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);
            await request(app.getHttpServer())
                .post('/auth/verify-email')
                .send({ email, verificationCode })
                .expect(201);

            // Try to login with wrong password
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password: wrongPassword })
                .expect(401);

            expect(response.body.message).toBe('Invalid credentials');
        });
    });
});

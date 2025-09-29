import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { EmailService } from '../../src/modules/email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AesGcmTokenCrypto } from '../../src/modules/auth/core/TokenCrypto';
import { PrismaTokenStore } from '../../src/modules/auth/core/TokenStore';
import { OAuth2Client } from '../../src/modules/auth/core/OAuth2Client';
import axios from 'axios';

// Mock axios to avoid real HTTP calls
jest.mock('axios', () => ({
    __esModule: true,
    default: { request: jest.fn() },
}));

const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    findById: jest.fn(),
    unlinkLinkedAccount: jest.fn(),
};

const mockRedisService = {
    setVerificationCode: jest.fn(),
    getVerificationCode: jest.fn(),
    deleteVerificationCode: jest.fn(),
};

const mockEmailService = {
    generateVerificationCode: jest.fn(),
    sendVerificationEmail: jest.fn(),
};

const mockConfigService = {
    get: jest.fn(() => undefined),
};

const mockJwtService = {
    signAsync: jest.fn(),
    sign: jest.fn(),
};

// Additional mocks to satisfy AuthService constructor without real API calls
const mockTokenCrypto: Pick<AesGcmTokenCrypto, 'encrypt' | 'decrypt'> = {
    encrypt: jest.fn((s: string) => `enc:${s}`),
    decrypt: jest.fn((s: string) => (s.startsWith('enc:') ? s.slice(4) : s)),
};

const mockTokenStore: Partial<PrismaTokenStore> = {};

const mockOAuth2Client: Partial<OAuth2Client> = {
    postForm: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;
    let usersService: typeof mockUsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: RedisService, useValue: mockRedisService },
                { provide: EmailService, useValue: mockEmailService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: AesGcmTokenCrypto, useValue: mockTokenCrypto },
                { provide: PrismaTokenStore, useValue: mockTokenStore },
                { provide: OAuth2Client, useValue: mockOAuth2Client },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);
        jest.clearAllMocks();
        
        // Default mock for services
        mockEmailService.generateVerificationCode.mockReturnValue('123456');
        mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
        mockRedisService.setVerificationCode.mockResolvedValue(undefined);
        mockRedisService.deleteVerificationCode.mockResolvedValue(undefined);
    });

    describe('register', () => {
        it('should throw if email already exists', async () => {
            usersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com' });
            await expect(service.register('a@a.com', 'password'))
                .rejects.toThrow('Email already in use');
        });

        it('should create user if email is free and send verification email', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            const hashedPassword = await bcrypt.hash('password', 10);
            usersService.createUser.mockResolvedValue({ id: '2', email: 'b@b.com', password_hash: hashedPassword, is_verified: false });

            const user = await service.register('b@b.com', 'password');
            expect(user.id).toEqual('2');
            expect(user.email).toEqual('b@b.com');
            
            // Verify that the services have been called
            expect(mockEmailService.generateVerificationCode).toHaveBeenCalled();
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith('b@b.com', '123456');
            expect(mockRedisService.setVerificationCode).toHaveBeenCalledWith('verification:b@b.com', '123456', 600);
        });
    });

    describe('validateUser', () => {
        it('should throw if user not found', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            await expect(service.validateUser('x@x.com', 'password'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should throw if user is not verified', async () => {
            const hashedPassword = await bcrypt.hash('correct', 10);
            usersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com', password_hash: hashedPassword, is_verified: false });
            await expect(service.validateUser('a@a.com', 'correct'))
                .rejects.toThrow('Account not verified. Please check your email for verification code.');
        });

        it('should throw if password is invalid', async () => {
            const hashedPassword = await bcrypt.hash('correct', 10);
            usersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com', password_hash: hashedPassword, is_verified: true });
            await expect(service.validateUser('a@a.com', 'wrong'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should return user if password is valid and user is verified', async () => {
            const hashedPassword = await bcrypt.hash('correct', 10);
            const user = { id: '1', email: 'a@a.com', password_hash: hashedPassword, is_verified: true };
            usersService.findByEmail.mockResolvedValue(user);

            const result = await service.validateUser('a@a.com', 'correct');
            expect(result).toEqual(user);
        });
    });

    describe('verifyEmail', () => {
        it('should verify email with correct code', async () => {
            const email = 'test@example.com';
            const verificationCode = '123456';
            const user = { id: '1', email, is_verified: false };

            usersService.findByEmail.mockResolvedValue(user);
            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);
            usersService.updateUser.mockResolvedValue({ ...user, is_verified: true });

            const result = await service.verifyEmail(email, verificationCode);

            expect(result).toBe(true);
            expect(mockRedisService.getVerificationCode).toHaveBeenCalledWith(`verification:${email}`);
            expect(usersService.updateUser).toHaveBeenCalledWith('1', { is_verified: true });
            expect(mockRedisService.deleteVerificationCode).toHaveBeenCalledWith(`verification:${email}`);
        });

        it('should throw error for expired code', async () => {
            const email = 'test@example.com';
            const verificationCode = '123456';

            mockRedisService.getVerificationCode.mockResolvedValue(null);

            await expect(service.verifyEmail(email, verificationCode))
                .rejects.toThrow('Verification code expired or invalid');
        });

        it('should throw error for incorrect code', async () => {
            const email = 'test@example.com';
            const verificationCode = '123456';
            const wrongCode = '654321';

            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);

            await expect(service.verifyEmail(email, wrongCode))
                .rejects.toThrow('Incorrect verification code');
        });

        it('should throw error for non-existent user', async () => {
            const email = 'test@example.com';
            const verificationCode = '123456';

            mockRedisService.getVerificationCode.mockResolvedValue(verificationCode);
            usersService.findByEmail.mockResolvedValue(null);

            await expect(service.verifyEmail(email, verificationCode))
                .rejects.toThrow('User not found');
        });
    });

    describe('resendVerificationEmail', () => {
        it('should resend verification email for unverified user', async () => {
            const email = 'test@example.com';
            const user = { id: '1', email, is_verified: false };

            usersService.findByEmail.mockResolvedValue(user);

            await service.resendVerificationEmail(email);

            expect(mockEmailService.generateVerificationCode).toHaveBeenCalled();
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(email, '123456');
            expect(mockRedisService.setVerificationCode).toHaveBeenCalledWith(`verification:${email}`, '123456', 600);
        });

        it('should throw error for non-existent user', async () => {
            const email = 'test@example.com';

            usersService.findByEmail.mockResolvedValue(null);

            await expect(service.resendVerificationEmail(email))
                .rejects.toThrow('User not found');
        });

        it('should throw error for already verified user', async () => {
            const email = 'test@example.com';
            const user = { id: '1', email, is_verified: true };

            usersService.findByEmail.mockResolvedValue(user);

            await expect(service.resendVerificationEmail(email))
                .rejects.toThrow('This account is already verified');
        });
    });

    describe('sendVerificationEmail', () => {
        it('should generate code, store in Redis and send email', async () => {
            const email = 'test@example.com';

            await service.sendVerificationEmail(email);

            expect(mockEmailService.generateVerificationCode).toHaveBeenCalled();
            expect(mockRedisService.setVerificationCode).toHaveBeenCalledWith(`verification:${email}`, '123456', 600);
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(email, '123456');
        });
    });

    describe('unlinkProvider', () => {
        it('should throw if user not found', async () => {
            mockUsersService.findById.mockResolvedValue(null);
            await expect(service.unlinkProvider('spotify' as any, 'u1')).rejects.toThrow('User not found');
        });

        it('should call unlink and return payload on success', async () => {
            mockUsersService.findById.mockResolvedValue({ id: 'u1', email: 'e' });
            mockUsersService.unlinkLinkedAccount.mockResolvedValue(undefined);
            const res = await service.unlinkProvider('spotify' as any, 'u1');
            expect(mockUsersService.unlinkLinkedAccount).toHaveBeenCalledWith('u1', 'spotify');
            expect(res).toEqual({ provider: 'spotify', userId: 'u1' });
        });
    });

    describe('oAuth2ApiRequest', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should make a single request with current access token and return data', async () => {
            // Spy on internal methods to avoid provider logic
            jest.spyOn(service, 'getCurrentAccessToken').mockResolvedValue('tok');
            const mockResponse = { data: { ok: true }, status: 200 };
            (axios as any).request.mockResolvedValue(mockResponse);

            const res = await service.oAuth2ApiRequest('spotify' as any, 'u1', { url: 'https://api', method: 'GET' });
            expect(service.getCurrentAccessToken).toHaveBeenCalledWith('spotify', 'u1');
            expect((axios as any).request).toHaveBeenCalledWith({ url: 'https://api', method: 'GET', headers: { Authorization: 'Bearer tok' } });
            expect(res).toEqual(mockResponse);
        });

        it('should refresh on 401 and retry once', async () => {
            jest.spyOn(service, 'getCurrentAccessToken').mockResolvedValue('old');
            jest.spyOn(service, 'refreshAccessToken').mockResolvedValue({ accessToken: 'new', expiresIn: 3600 });
            const err401: any = new Error('Unauthorized');
            err401.response = { status: 401 };
            (axios as any).request
                .mockRejectedValueOnce(err401)
                .mockResolvedValueOnce({ data: { ok: true }, status: 200 });

            const res = await service.oAuth2ApiRequest('spotify' as any, 'u1', { url: 'https://api', method: 'GET' });
            expect(service.refreshAccessToken).toHaveBeenCalledWith('spotify', 'u1');
            expect((axios as any).request).toHaveBeenNthCalledWith(1, { url: 'https://api', method: 'GET', headers: { Authorization: 'Bearer old' } });
            expect((axios as any).request).toHaveBeenNthCalledWith(2, { url: 'https://api', method: 'GET', headers: { Authorization: 'Bearer new' } });
            expect(res).toEqual({ data: { ok: true }, status: 200 });
        });

        it('should rethrow non-401 errors', async () => {
            jest.spyOn(service, 'getCurrentAccessToken').mockResolvedValue('tok');
            const err500: any = new Error('Boom');
            err500.response = { status: 500 };
            (axios as any).request.mockRejectedValueOnce(err500);
            await expect(service.oAuth2ApiRequest('spotify' as any, 'u1', { url: 'https://api', method: 'GET' }))
                .rejects.toThrow('Boom');
        });
    });
});

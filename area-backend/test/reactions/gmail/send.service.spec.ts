import { Test, TestingModule } from '@nestjs/testing';
import { GmailSendService } from '../../../src/modules/reactions/gmail/send.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

// Mock UsersService
const mockUsersService = {
    findLinkedAccount: jest.fn(),
};

// Mock AuthService
const mockAuthService = {
    getCurrentAccessToken: jest.fn(),
    oAuth2ApiRequest: jest.fn(),
};

describe('GmailSendService', () => {
    let service: GmailSendService;
    let usersService: typeof mockUsersService;
    let authService: typeof mockAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GmailSendService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        service = module.get<GmailSendService>(GmailSendService);
        usersService = module.get(UsersService);
        authService = module.get(AuthService);
        jest.clearAllMocks();
    });

    describe('run', () => {
        const userId = 'user-123';
        const params = {
            to: 'recipient@example.com',
            subject: 'Test Subject',
            body: 'Test email body content',
        };

        it('should send email successfully when user has linked Gmail account and valid token', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            const mockUserinfo = { data: { email: 'user@gmail.com' }, status: 200 };
            const mockSendResponse = { data: { id: 'message-id' }, status: 200 };

            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce(mockUserinfo) // userinfo GET
                .mockResolvedValueOnce(mockSendResponse); // send POST

            // Act
            await service.run(userId, params);

            // Assert
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Google);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Google, userId);
            expect(authService.oAuth2ApiRequest).toHaveBeenNthCalledWith(
                1,
                ProviderKeyEnum.Google,
                userId,
                expect.objectContaining({ method: 'GET', url: 'https://openidconnect.googleapis.com/v1/userinfo' })
            );
            expect(authService.oAuth2ApiRequest).toHaveBeenNthCalledWith(
                2,
                ProviderKeyEnum.Google,
                userId,
                expect.objectContaining({
                    method: 'POST',
                    url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                    headers: {
                        Authorization: `Bearer ${mockAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        raw: expect.any(String),
                    },
                })
            );
        });

        it('should throw error when user does not have linked Gmail account', async () => {
            // Arrange
            usersService.findLinkedAccount.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Gmail account not linked');
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Google);
            expect(authService.getCurrentAccessToken).not.toHaveBeenCalled();
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw error when access token cannot be obtained', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Failed to obtain access token');
            expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Google);
            expect(authService.getCurrentAccessToken).toHaveBeenCalledWith(ProviderKeyEnum.Google, userId);
            expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
        });

        it('should throw error when access token is empty string', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue('');

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Failed to obtain access token');
        });

        it('should construct proper RFC 2822 email format', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce({ data: { email: 'user@gmail.com' }, status: 200 }) // userinfo
                .mockResolvedValueOnce({ data: { id: 'message-id' }, status: 200 }); // send

            // Act
            await service.run(userId, params);

            // Assert
            const oAuthSendCall = authService.oAuth2ApiRequest.mock.calls[1][2];
            const rawEmail = Buffer.from(oAuthSendCall.data.raw, 'base64').toString();
            expect(rawEmail).toContain(`To: ${params.to}`);
            expect(rawEmail).toContain(`Subject: ${params.subject}`);
            expect(rawEmail).toContain('Content-Type: text/plain; charset="UTF-8"');
            expect(rawEmail).toContain('MIME-Version: 1.0');
            expect(rawEmail).toContain(params.body);
        });

        it('should encode email properly for Gmail API', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce({ data: { email: 'user@gmail.com' }, status: 200 })
                .mockResolvedValueOnce({ data: { id: 'message-id' }, status: 200 });

            // Act
            await service.run(userId, params);

            // Assert
            const oAuthSendCall = authService.oAuth2ApiRequest.mock.calls[1][2];
            const encodedEmail = oAuthSendCall.data.raw;
            expect(encodedEmail).not.toContain('+');
            expect(encodedEmail).not.toContain('/');
            expect(encodedEmail).not.toContain('=');
            expect(typeof encodedEmail).toBe('string');
            expect(encodedEmail.length).toBeGreaterThan(0);
        });

        it('should handle special characters in email content', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            const specialParams = {
                to: 'test+user@example.com',
                subject: 'Test with émojis 🚀 and special chars: <>&"',
                body: 'Body with\nnewlines and\ttabs and special chars: àáâãäå',
            };
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce({ data: { email: 'user@gmail.com' }, status: 200 })
                .mockResolvedValueOnce({ data: { id: 'message-id' }, status: 200 });

            // Act
            await service.run(userId, specialParams);

            // Assert
            const oAuthSendCall = authService.oAuth2ApiRequest.mock.calls[1][2];
            const rawEmail = Buffer.from(oAuthSendCall.data.raw, 'base64').toString();
            expect(rawEmail).toContain(specialParams.to);
            expect(rawEmail).toContain(specialParams.subject);
            expect(rawEmail).toContain(specialParams.body);
        });

        it('should propagate oAuth2ApiRequest errors', async () => {
            // Arrange
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            const apiError = new Error('Gmail API error');
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce({ data: { email: 'user@gmail.com' }, status: 200 }) // userinfo ok
                .mockRejectedValueOnce(apiError); // send fails

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Gmail API error');
        });
    });

    describe('getFields', () => {
        it('should return required fields for email sending', () => {
            // Act
            const fields = service.getFields();

            // Assert
            expect(fields).toHaveLength(3);
            expect(fields).toEqual([
                { name: 'to', type: 'string', required: true },
                { name: 'subject', type: 'string', required: true },
                { name: 'body', type: 'string', required: true },
            ]);
        });

        it('should return consistent field structure', () => {
            // Act
            const fields = service.getFields();

            // Assert
            fields.forEach(field => {
                expect(field).toHaveProperty('name');
                expect(field).toHaveProperty('type');
                expect(field).toHaveProperty('required');
                expect(typeof field.name).toBe('string');
                expect(typeof field.type).toBe('string');
                expect(typeof field.required).toBe('boolean');
            });
        });
    });

    describe('error handling and logging', () => {
        it('should log warning when Gmail account is not linked', async () => {
            // Arrange
            const userId = 'user-without-gmail';
            const params = { to: 'test@example.com', subject: 'Test', body: 'Test body' };
            const loggerSpy = jest.spyOn(service['logger'], 'warn');
            
            usersService.findLinkedAccount.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Gmail account not linked');
            expect(loggerSpy).toHaveBeenCalledWith(`User ${userId} does not have a linked Gmail account.`);
        });

        it('should log warning when access token cannot be obtained', async () => {
            // Arrange
            const userId = 'user-with-invalid-token';
            const params = { to: 'test@example.com', subject: 'Test', body: 'Test body' };
            const loggerSpy = jest.spyOn(service['logger'], 'warn');
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(null);

            // Act & Assert
            await expect(service.run(userId, params)).rejects.toThrow('Failed to obtain access token');
            expect(loggerSpy).toHaveBeenCalledWith(`Failed to obtain access token for user ${userId}.`);
        });

        it('should log success when email is sent', async () => {
            // Arrange
            const userId = 'user-success';
            const params = { to: 'success@example.com', subject: 'Success', body: 'Success body' };
            const loggerSpy = jest.spyOn(service['logger'], 'log');
            const mockLinkedAccount = { id: 'linked-account-id', provider: 'google' };
            const mockAccessToken = 'valid-access-token';
            usersService.findLinkedAccount.mockResolvedValue(mockLinkedAccount);
            authService.getCurrentAccessToken.mockResolvedValue(mockAccessToken);
            authService.oAuth2ApiRequest
                .mockResolvedValueOnce({ data: { email: 'user@gmail.com' }, status: 200 })
                .mockResolvedValueOnce({ data: { id: 'message-id' }, status: 200 });

            // Act
            await service.run(userId, params);

            // Assert
            expect(loggerSpy).toHaveBeenCalledWith(`Email sent to ${params.to} for user ${userId}.`);
        });
    });
});

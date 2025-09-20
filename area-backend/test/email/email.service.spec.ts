import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../src/modules/email/email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
const mockTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
};

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => mockTransporter),
}));

describe('EmailService', () => {
    let service: EmailService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EmailService],
        }).compile();

        service = module.get<EmailService>(EmailService);
        jest.clearAllMocks();
    });

    describe('generateVerificationCode', () => {
        it('should generate a 6-digit code', () => {
            const code = service.generateVerificationCode();

            expect(code).toMatch(/^\d{6}$/);
            expect(code.length).toBe(6);
        });

        it('should generate different codes on multiple calls', () => {
            const code1 = service.generateVerificationCode();
            const code2 = service.generateVerificationCode();

            // Il est très peu probable que deux codes générés aléatoirement soient identiques
            expect(code1).not.toBe(code2);
        });

        it('should generate codes within valid range (100000-999999)', () => {
            const code = service.generateVerificationCode();
            const numericCode = parseInt(code);

            expect(numericCode).toBeGreaterThanOrEqual(100000);
            expect(numericCode).toBeLessThanOrEqual(999999);
        });
    });

    describe('sendVerificationEmail', () => {
        it('should send verification email successfully', async () => {
            const to = 'test@example.com';
            const verificationCode = '123456';

            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            await service.sendVerificationEmail(to, verificationCode);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: to,
                subject: 'Vérification de votre compte AREA',
                html: expect.stringContaining(verificationCode),
            });
        });

        it('should throw error when email sending fails', async () => {
            const to = 'test@example.com';
            const verificationCode = '123456';

            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

            await expect(service.sendVerificationEmail(to, verificationCode))
                .rejects.toThrow('Failed to send verification email');
        });

        it('should include verification code in email template', async () => {
            const to = 'test@example.com';
            const verificationCode = '123456';

            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            await service.sendVerificationEmail(to, verificationCode);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.html).toContain(verificationCode);
        });

        it('should include current year in email template', async () => {
            const to = 'test@example.com';
            const verificationCode = '123456';
            const currentYear = new Date().getFullYear().toString();

            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            await service.sendVerificationEmail(to, verificationCode);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.html).toContain(`© ${currentYear} AREA`);
        });
    });

    describe('verifyConnection', () => {
        it('should return true when SMTP connection is successful', async () => {
            mockTransporter.verify.mockResolvedValue(true);

            const result = await service.verifyConnection();

            expect(result).toBe(true);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        it('should return false when SMTP connection fails', async () => {
            mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

            const result = await service.verifyConnection();

            expect(result).toBe(false);
        });
    });

    describe('email template generation', () => {
        it('should generate valid HTML template', () => {
            const verificationCode = '123456';
            const template = (service as any).generateVerificationEmailTemplate(verificationCode);

            expect(template).toContain('<!DOCTYPE html>');
            expect(template).toContain('<html>');
            expect(template).toContain('</html>');
            expect(template).toContain(verificationCode);
            expect(template).toContain('AREA - Vérification de compte');
            expect(template).toContain('Ce code expire dans 10 minutes');
        });

        it('should include proper CSS styling', () => {
            const verificationCode = '123456';
            const template = (service as any).generateVerificationEmailTemplate(verificationCode);

            expect(template).toContain('<style>');
            expect(template).toContain('font-family: Arial, sans-serif');
            expect(template).toContain('background-color: #4CAF50');
            expect(template).toContain('border-radius: 5px');
        });

        it('should include proper structure with header, content, and footer', () => {
            const verificationCode = '123456';
            const template = (service as any).generateVerificationEmailTemplate(verificationCode);

            expect(template).toContain('class="header"');
            expect(template).toContain('class="content"');
            expect(template).toContain('class="footer"');
            expect(template).toContain('class="code"');
        });
    });
});

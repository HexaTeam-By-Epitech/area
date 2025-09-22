import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Email service for sending verification codes via SMTP.
 * Handles SMTP transporter configuration and email sending logic.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly currentYear: string;

  constructor() {
    this.currentYear = new Date().getFullYear().toString();
    this.initializeTransporter(); // Initialize SMTP transporter on service creation
  }

  /**
   * Initialize SMTP transporter with configuration from environment variables.
   * Required configuration in .env:
   * - SMTP_HOST: SMTP server (e.g. smtp.gmail.com)
   * - SMTP_PORT: SMTP port (e.g. 587)
   * - SMTP_USER: SMTP username for authentication
   * - SMTP_PASS: SMTP password for authentication
   * - SMTP_FROM: Sender email address (can be different from SMTP_USER)
   */
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Generate a 6-digit verification code.
   * @returns Random 6-digit verification code as string.
   */
  generateVerificationCode(): string {
    // Generates a random integer between 100000 and 999999 (inclusive)
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Verify SMTP connection configuration.
   * @returns true if connection succeeds, false otherwise
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build the HTML template for the verification email (French content as expected by tests).
   */
  private generateVerificationEmailTemplate(code: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AREA - Vérification de compte</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background-color: #4CAF50; color: #ffffff; padding: 16px 24px; }
    .content { padding: 24px; }
    .code { font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #f0f0f0; padding: 12px 16px; border-radius: 5px; text-align: center; }
    .footer { color: #666; font-size: 12px; padding: 16px 24px; border-top: 1px solid #eee; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>AREA - Vérification de compte</h1>
      </div>
      <div class="content">
        <p>Voici votre code de vérification. Ce code expire dans 10 minutes.</p>
        <div class="code">${code}</div>
      </div>
      <div class="footer">© ${this.currentYear} AREA</div>
    </div>
  </body>
  </html>`;
  }

  /**
   * Send a verification email with the 6-digit code.
   * @param to - Recipient email address
   * @param code - Verification code to send
   * @returns Promise resolving when email is sent
   */
  async sendVerificationEmail(to: string, code: string): Promise<void> {
    try {
      const html = this.generateVerificationEmailTemplate(code);
      // Compose email content
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'Vérification de votre compte AREA',
        html,
      } as const;
      // Send email using transporter
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }
}

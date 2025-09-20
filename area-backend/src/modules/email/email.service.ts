import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Email service for sending verification codes via SMTP
 * Manages SMTP transporter configuration and email sending
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly currentYear: string;

  constructor() {
    this.currentYear = new Date().getFullYear().toString();
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter with configuration from environment variables
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
   * Generate a 6-digit verification code
   * @returns Random 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send a verification email with the 6-digit code
   * @param to - Recipient email address
   * @param verificationCode - 6-digit verification code
   * @returns Promise resolved if email is sent successfully
   */
  async sendVerificationEmail(
    to: string,
    verificationCode: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: 'Vérification de votre compte AREA',
      html: this.generateVerificationEmailTemplate(verificationCode),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Generate HTML template for verification email
   * @param verificationCode - Verification code to include in the email
   * @returns Formatted HTML template for the email
   */
  private generateVerificationEmailTemplate(verificationCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Vérification de votre compte AREA</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .code { font-size: 24px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background-color: white; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AREA - Vérification de compte</h1>
            </div>
            <div class="content">
              <h2>Bonjour,</h2>
              <p>Merci de vous être inscrit sur AREA ! Pour activer votre compte, veuillez utiliser le code de vérification suivant :</p>
              <div class="code">${verificationCode}</div>
              <p><strong>Ce code expire dans 10 minutes.</strong></p>
              <p>Si vous n'avez pas créé de compte sur AREA, vous pouvez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>© ${this.currentYear} AREA. Tous droits réservés.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Test SMTP connection
   * @returns Promise resolved if connection is successful
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}

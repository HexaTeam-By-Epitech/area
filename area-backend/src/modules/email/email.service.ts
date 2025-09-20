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
   * Send a verification email with the 6-digit code.
   * @param to - Recipient email address
   * @param code - Verification code to send
   * @returns Promise resolving when email is sent
   */
  async sendVerificationEmail(to: string, code: string): Promise<void> {
    try {
      // Compose email content
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <b>${code}</b></p><p>&copy; ${this.currentYear}</p>`,
      };
      // Send email using transporter
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw error;
    }
  }
}

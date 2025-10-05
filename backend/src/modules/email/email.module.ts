import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Email module for email sending management
 * Used for sending verification codes via SMTP
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

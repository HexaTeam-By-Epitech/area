import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for resending verification code request
 * Used to validate email resend request data
 */
export class ResendVerificationDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address to resend verification code to'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

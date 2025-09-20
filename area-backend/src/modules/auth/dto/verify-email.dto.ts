import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for email verification with verification code
 * Used to validate email verification data
 */
export class VerifyEmailDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address to verify'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ 
    example: '123456',
    description: '6-digit verification code',
    minLength: 6,
    maxLength: 6
  })
  @IsString({ message: 'Verification code must be a string' })
  @Length(6, 6, { message: 'Verification code must contain exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only digits' })
  verificationCode: string;
}

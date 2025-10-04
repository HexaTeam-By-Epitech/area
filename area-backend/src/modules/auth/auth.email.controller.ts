import { Controller, Post, Body } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Controller handling email/password authentication flows:
 * registration, login, email verification, and resending verification.
 */
@ApiTags('Auth - Email')
@Controller('auth')
export class AuthEmailController {
  constructor(private authService: AuthService) {}

  /**
   * Registers a new user account and sends a verification email.
   *
   * @param dto - Registration payload containing email and password.
   * @returns A confirmation message and the newly created user ID.
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully. Verification email sent.' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() dto: RegisterDto) {
    // Create the user and dispatch verification email
    const user = await this.authService.register(dto.email, dto.password);
    return { message: 'User registered successfully. Please check your email for verification code.', userId: user.id };
  }

  /**
   * Authenticates a user with email and password.
   *
   * @param dto - Login payload containing email and password.
   * @returns JWT access token and user information.
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful. Returns JWT access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account not verified' })
  async login(@Body() dto: LoginDto) {
    // Validate credentials and generate JWT
    const result = await this.authService.validateUser(dto.email, dto.password);
    return {
      message: 'Login successful',
      ...result,
    };
  }

  /**
   * Verifies a user's email using a verification code.
   *
   * @param dto - DTO with email and verification code.
   * @returns A confirmation message upon successful verification.
   */
  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with verification code' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.email, dto.verificationCode);
    return { message: 'Email verified successfully' };
  }

  /**
   * Resends the verification email to a user.
   *
   * @param dto - DTO with the target email address.
   * @returns A confirmation message when the email is dispatched.
   */
  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 400, description: 'Account already verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(dto.email);
    return { message: 'Verification email sent successfully' };
  }
}

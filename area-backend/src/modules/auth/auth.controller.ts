import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ status: 201, description: 'User registered successfully. Verification email sent.' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async register(@Body() dto: RegisterDto) {
        const user = await this.authService.register(dto.email, dto.password);
        return { 
            message: 'User registered successfully. Please check your email for verification code.', 
            userId: user.id 
        };
    }

    @Post('login')
    @ApiOperation({ summary: 'Login a user' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or account not verified' })
    async login(@Body() dto: LoginDto) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        return { message: 'Login successful', userId: user.id };
    }

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

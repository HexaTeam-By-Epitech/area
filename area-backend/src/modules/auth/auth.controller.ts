import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.authService.register(dto.email, dto.password);
        return { message: 'User registered', userId: user.id };
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        // You can generate a JWT here if needed
        return { message: 'Login successful', userId: user.id };
    }
}

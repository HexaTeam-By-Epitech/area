import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService) {}

    async register(email: string, password: string) {
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            throw new ConflictException('Email already in use');
        }

        const hash = await bcrypt.hash(password, 10);
        return this.usersService.createUser({
            email,
            password_hash: hash,
        });
    }

    async validateUser(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }
}

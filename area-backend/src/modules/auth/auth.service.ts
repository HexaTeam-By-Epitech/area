import {Injectable, UnauthorizedException, ConflictException} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {UsersService} from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService) {
    }

    /**
     * Registers a new user with the given email and password.
     * Throws ConflictException if the email is already in use.
     * @param email - The user's email address
     * @param password - The user's plain password
     * @returns The created user object
     */
    async register(email: string, password: string) {
        // Check if the email is already registered
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            throw new ConflictException('Email already in use');
        }

        // Hash the password before saving
        const hash = await bcrypt.hash(password, 10);
        return this.usersService.createUser({
            email,
            password_hash: hash,
        });
    }

    /**
     * Validates a user's credentials.
     * Throws UnauthorizedException if credentials are invalid.
     * @param email - The user's email address
     * @param password - The user's plain password
     * @returns The user object if validation succeeds
     */
    async validateUser(email: string, password: string) {
        // Find user by email
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Ensure the user has a password hash
        if (!user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Compare the provided password with the stored hash
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }
}

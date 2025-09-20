import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../../prisma/prisma.service';
import {CreateUserDto} from './dto/create-user.dto';
import {UpdateUserDto} from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {
    }

    /**
     * Retrieve all users from the database.
     * @returns Array of user objects
     */
    async findAll() {
        return this.prisma.users.findMany();
    }

    /**
     * Find a user by their unique ID.
     * Throws NotFoundException if user does not exist.
     * @param id - User's unique identifier
     * @returns The user object if found
     */
    async findOne(id: string) {
        const user = await this.prisma.users.findUnique({where: {id}});
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    /**
     * Find a user by their email address.
     * @param email - User's email address
     * @returns The user object if found, otherwise null
     */
    async findByEmail(email: string) {
        return this.prisma.users.findUnique({where: {email}});
    }

    /**
     * Create a new user in the database.
     * @param data - Data for creating the user (email, password hash)
     * @returns The created user object
     */
    async createUser(data: CreateUserDto) {
        return this.prisma.users.create({
            data: {
                email: data.email, // User's email address
                password_hash: data.password_hash, // Hashed password
                is_verified: false, // New users are not verified by default
                is_active: true, // New users are active by default
            },
        });
    }

    /**
     * Update an existing user's data.
     * @param id - User's unique identifier
     * @param data - Data to update
     * @returns The updated user object
     */
    async updateUser(id: string, data: UpdateUserDto) {
        return this.prisma.users.update({where: {id}, data});
    }

    /**
     * Delete a user from the database.
     * @param id - User's unique identifier
     * @returns The deleted user object
     */
    async deleteUser(id: string) {
        return this.prisma.users.delete({where: {id}});
    }
}

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
     * @param data - Data for creating the user (email, password hash, verification status)
     * @returns The created user object
     */
    async createUser(data: CreateUserDto) {
        return this.prisma.users.create({
            data: {
                email: data.email, // User's email address
                password_hash: data.password_hash, // Hashed password
                is_verified: data.is_verified ?? false, // Use provided value or default to false
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

    async findById(id: string) {
        return this.prisma.users.findUnique({where: {id}});
    }

    async findUserOAuthAccount(userId: string, provider: 'google' | 'spotify') {
        const providerId = provider === 'google' ? 1 : 2;
        return this.prisma.user_oauth_accounts.findUnique({
            where: {user_id_provider_id: {user_id: userId, provider_id: providerId}},
        });
    }

    async updateOAuthTokens(
        userId: string,
        provider: 'google' | 'spotify',
        input: { accessToken?: string; accessTokenExpiresAt?: Date; refreshToken?: string },
    ) {
        const providerId = provider === 'google' ? 1 : 2;
        return this.prisma.user_oauth_accounts.update({
            where: {user_id_provider_id: {user_id: userId, provider_id: providerId}},
            data: {
                access_token: input.accessToken ?? undefined,
                refresh_token: input.refreshToken ?? undefined,
                updated_at: new Date(),
            },
        });
    }

    async upsertOAuthUser(input: {
        provider: 'google' | 'spotify';
        providerId: number;
        providerUserId: string;
        email: string;
        name?: string;
        avatarUrl?: string;
        accessToken?: string | null;
        refreshToken?: string | null;
        accessTokenExpiresAt?: Date | null;
        targetUserId?: string; // if provided, link OAuth account to this existing user
    }) {
        const {
            providerId,
            providerUserId,
            email,
            name,
            avatarUrl,
            accessToken = null,
            refreshToken = null,
            accessTokenExpiresAt = null,
            targetUserId,
        } = input;

        // 1) Determine target user: prefer explicit targetUserId if provided
        let user;
        if (targetUserId) {
            user = await this.prisma.users.findUnique({ where: { id: targetUserId } });
            if (!user) {
                throw new NotFoundException('Target user not found');
            }
        } else {
            user = await this.prisma.users.findUnique({ where: { email } });
            if (!user) {
                user = await this.prisma.users.create({
                    data: {
                        email,
                        is_verified: true,
                        is_active: true,
                    },
                });
            }
        }

        // 2) Upsert OAuth account for provider
        await this.prisma.user_oauth_accounts.upsert({
            where: {
                provider_id_provider_user_id: {
                    provider_id: providerId,
                    provider_user_id: providerUserId,
                },
            },
            update: {
                user_id: user.id,
                access_token: accessToken ?? undefined,
                refresh_token: refreshToken ?? undefined,
                is_active: true,
                updated_at: new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                user_id: user.id,
                provider_id: providerId,
                provider_user_id: providerUserId,
                access_token: accessToken,
                refresh_token: refreshToken,
                is_active: true,
            },
        });

        // Optionally update user profile basics if provided
        if ((name && name.length) || (avatarUrl && avatarUrl.length)) {
            try {
                await this.prisma.users.update({
                    where: { id: user.id },
                    data: {
                        // Only set if your schema has these fields; if not, ignore silently
                        // name, avatar_url
                    } as any,
                });
            } catch {
                // ignore optional profile updates if fields not present in schema
            }
        }

        return user;
    }
}

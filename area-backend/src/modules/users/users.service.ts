import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../../prisma/prisma.service';
import {CreateUserDto} from './dto/create-user.dto';
import {UpdateUserDto} from './dto/update-user.dto';
import { ProviderKeyEnum } from 'src/common/interfaces/oauth2.type';
import * as crypto from 'crypto';

/**
 * Domain service for user management and identity/linking operations.
 *
 * Wraps Prisma queries and encapsulates logic for OAuth provider linking,
 * identity upserts, and token updates.
 */
@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {
    }

    /**
     * Retrieve all users from the database.
     * @returns Array of user objects
     */
    async findAll() {
        return this.prisma.users.findMany({
            include: {
                auth_identities: true,
                linked_accounts: {
                    select: {
                        id: true,
                        provider_user_id: true,
                        scopes: true,
                        access_token_expires_at: true,
                        is_active: true,
                        created_at: true,
                        updated_at: true,
                        oauth_providers: { select: { id: true, name: true, is_active: true } },
                    },
                },
            },
        });
    }

    /**
     * Find a user by their unique ID.
     * Throws NotFoundException if user does not exist.
     * @param id - User's unique identifier
     * @returns The user object if found
     */
    async findOne(id: string) {
        const user = await this.prisma.users.findUnique({
            where: { id },
            include: {
                auth_identities: true,
                linked_accounts: {
                    select: {
                        id: true,
                        provider_user_id: true,
                        scopes: true,
                        access_token_expires_at: true,
                        is_active: true,
                        created_at: true,
                        updated_at: true,
                        oauth_providers: { select: { id: true, name: true, is_active: true } },
                    },
                },
            },
        });
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
        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.users.findUnique({ where: { id } });
            if (!user) {
                throw new NotFoundException('User not found');
            }
            await tx.auth_identities.deleteMany({ where: { user_id: id } });
            await tx.linked_accounts.deleteMany({ where: { user_id: id } });
            return tx.users.delete({ where: { id } });
        });
    }

    async findById(id: string) {
        return this.prisma.users.findUnique({where: {id}});
    }

    /**
     * Find a linked external account for a given user and provider.
     * @param userId - The user ID.
     * @param provider - Provider enum key.
     * @returns The linked account row or null if not found.
     */
    async findLinkedAccount(userId: string, provider: ProviderKeyEnum) {
        const providerId = await this.getOrCreateProviderIdByName(provider);
        return this.prisma.linked_accounts.findUnique({
            where: { user_id_provider_id: { user_id: userId, provider_id: providerId } },
        });
    }

    /**
     * Ensure the oauth provider row exists (by fixed numeric id) to satisfy FK constraints.
     */
    private async ensureProviderByName(name: ProviderKeyEnum): Promise<{ id: number }> {
        // Avoid raw SQL: try find by name, else create. Also set active if found.
        const existing = await this.prisma.oauth_providers.findFirst({ where: { name } });
        if (existing) {
            if (!existing.is_active) {
                await this.prisma.oauth_providers.update({ where: { id: existing.id }, data: { is_active: true } });
            }
            return { id: existing.id };
        }
        const created = await this.prisma.oauth_providers.create({ data: { name, is_active: true } });
        return { id: created.id };
    }

    /**
     * Resolve provider id by name, creating the provider row if needed.
     * @param name - Provider enum key.
     * @returns Numeric provider id.
     */
    private async getOrCreateProviderIdByName(name: ProviderKeyEnum): Promise<number> {
        const { id } = await this.ensureProviderByName(name);
        return id;
    }

    /**
     * Update stored OAuth tokens for a user's linked account.
     * @param userId - The user ID.
     * @param provider - Provider enum key.
     * @param input - Partial token fields to update.
     */
    async updateLinkedTokens(
        userId: string,
        provider: ProviderKeyEnum,
        input: { accessToken?: string; accessTokenExpiresAt?: Date; refreshToken?: string },
    ) {
        const providerId = await this.getOrCreateProviderIdByName(provider);
        return this.prisma.linked_accounts.update({
            where: { user_id_provider_id: { user_id: userId, provider_id: providerId } },
            data: {
                access_token: input.accessToken ?? undefined,
                refresh_token: input.refreshToken ?? undefined,
                access_token_expires_at: input.accessTokenExpiresAt ?? undefined,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Upsert a login identity (e.g., Google) and return the associated user.
     * Creates the user if they do not yet exist (by email).
     */
    async upsertIdentityForLogin(input: {
        provider: ProviderKeyEnum;
        providerUserId: string;
        email: string;
        name?: string;
        avatarUrl?: string;
        userId?: string; // optional existing user to attach identity to
    }) {
        const { provider, providerUserId, email, name, avatarUrl, userId: targetUserId } = input;

        const providerId = await this.getOrCreateProviderIdByName(provider);

        let user;
        if (targetUserId) {
            user = await this.prisma.users.findUnique({ where: { id: targetUserId } });
            if (!user) throw new NotFoundException('User not found for provided userId');
            // Optionally, could enforce email consistency; for now we keep existing user email.
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

        await this.prisma.auth_identities.upsert({
            where: {
                provider_id_provider_user_id: {
                    provider_id: providerId,
                    provider_user_id: providerUserId,
                },
            },
            update: {
                user_id: user.id,
                email: email ?? undefined,
                name: name ?? undefined,
                avatar_url: avatarUrl ?? undefined,
                updated_at: new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                user_id: user.id,
                provider_id: providerId,
                provider_user_id: providerUserId,
                email,
                name,
                avatar_url: avatarUrl,
            },
        });

        return user;
    }

    /**
     * Link an external account (e.g., Spotify) to an existing user using tokens.
     * Creates or updates the `linked_accounts` row.
     */
    async linkExternalAccount(input: {
        userId: string;
        provider: ProviderKeyEnum;
        providerUserId: string;
        accessToken?: string | null;
        refreshToken?: string | null;
        accessTokenExpiresAt?: Date | null;
        scopes?: string | null;
    }) {
        const { userId, provider, providerUserId, accessToken = null, refreshToken = null, accessTokenExpiresAt = null, scopes = null } = input;

        const user = await this.prisma.users.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Resolve provider id by name and ensure it exists
        const providerId = await this.getOrCreateProviderIdByName(provider);

        await this.prisma.linked_accounts.upsert({
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
                access_token_expires_at: accessTokenExpiresAt ?? undefined,
                scopes: scopes ?? undefined,
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
                access_token_expires_at: accessTokenExpiresAt,
                scopes,
                is_active: true,
            },
        });

        return user;
    }

    /**
     * Unlink an external account (remove linked_accounts row) for a user and provider
     */
    async unlinkLinkedAccount(userId: string, provider: ProviderKeyEnum): Promise<void> {
        const providerId = await this.getOrCreateProviderIdByName(provider);
        await this.prisma.linked_accounts.deleteMany({
            where: { user_id: userId, provider_id: providerId },
        });
    }
}

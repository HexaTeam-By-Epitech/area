import {Injectable, NotFoundException, ConflictException} from '@nestjs/common';
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
            select: {
                id: true,
                email: true,
                is_verified: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
            select: {
                id: true,
                email: true,
                is_verified: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
        return this.prisma.users.update({
            where: {id},
            data,
            select: {
                id: true,
                email: true,
                is_verified: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
            },
        });
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
            await tx.event_logs.deleteMany({ where: { user_id: id } });
            await tx.auth_identities.deleteMany({ where: { user_id: id } });
            await tx.linked_accounts.deleteMany({ where: { user_id: id } });
            await tx.areas.deleteMany({ where: { user_id: id } });
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
     * Get all linked accounts for a user with provider information
     * @param userId - The user ID
     * @returns Array of linked accounts with provider details
     */
    async getLinkedAccounts(userId: string) {
        return this.prisma.linked_accounts.findMany({
            where: { user_id: userId, is_active: true },
            select: {
                id: true,
                provider_user_id: true,
                scopes: true,
                is_active: true,
                oauth_providers: {
                    select: {
                        id: true,
                        name: true,
                        is_active: true,
                    },
                },
            },
        });
    }

    /**
     * Get all linked identity providers for a user
     * @param userId - The user ID
     * @returns Array of linked identity providers with provider details
     */
    async getLinkedIdentities(userId: string) {
        return this.prisma.auth_identities.findMany({
            where: { user_id: userId },
            select: {
                id: true,
                provider_user_id: true,
                email: true,
                name: true,
                oauth_providers: {
                    select: {
                        id: true,
                        name: true,
                        is_active: true,
                    },
                },
            },
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
     * SECURITY: Only logs in if the identity already exists. Creates new user only if identity is new.
     * This prevents account takeover by someone using the same email on a different provider.
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

        // If targetUserId provided, delegate to linkIdentityToUser for authenticated linking
        if (targetUserId) {
            return this.linkIdentityToUser({
                userId: targetUserId,
                provider,
                providerUserId,
                email,
                name,
                avatarUrl,
            });
        }

        // SECURITY FIX: First check if this specific identity (provider + providerUserId) exists
        const existingIdentity = await this.prisma.auth_identities.findUnique({
            where: {
                provider_id_provider_user_id: {
                    provider_id: providerId,
                    provider_user_id: providerUserId,
                },
            },
            select: {
                user_id: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        is_verified: true,
                        is_active: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                    },
                },
            },
        });

        // If identity exists, return the associated user (login)
        if (existingIdentity) {
            // Update identity metadata
            await this.prisma.auth_identities.update({
                where: {
                    provider_id_provider_user_id: {
                        provider_id: providerId,
                        provider_user_id: providerUserId,
                    },
                },
                data: {
                    email: email ?? undefined,
                    name: name ?? undefined,
                    avatar_url: avatarUrl ?? undefined,
                    updated_at: new Date(),
                },
            });
            return existingIdentity.users;
        }

        // Identity doesn't exist - check if email is already taken
        const existingUser = await this.prisma.users.findUnique({
            where: { email },
            select: { id: true, email: true },
        });

        if (existingUser) {
            // Email already exists with a different account (e.g., email/password or different provider)
            // SECURITY: Reject to prevent account takeover
            throw new ConflictException(
                `An account with email ${email} already exists. Please log in with your existing account and link ${provider} from your profile settings.`
            );
        }

        // Email is free - create new user with this identity
        const newUser = await this.prisma.users.create({
            data: {
                email,
                is_verified: true,
                is_active: true,
            },
            select: {
                id: true,
                email: true,
                is_verified: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
            },
        });

        // Create the identity
        await this.prisma.auth_identities.create({
            data: {
                id: crypto.randomUUID(),
                user_id: newUser.id,
                provider_id: providerId,
                provider_user_id: providerUserId,
                email,
                name,
                avatar_url: avatarUrl,
            },
        });

        return newUser;
    }

    /**
     * Link an identity provider to an existing user (for authenticated identity linking).
     * Creates or updates the `auth_identities` row for the given user.
     */
    async linkIdentityToUser(input: {
        userId: string;
        provider: ProviderKeyEnum;
        providerUserId: string;
        email: string;
        name?: string;
        avatarUrl?: string;
    }) {
        const { userId, provider, providerUserId, email, name, avatarUrl } = input;

        // Resolve provider id by name and ensure it exists
        const providerId = await this.getOrCreateProviderIdByName(provider);

        // Verify user exists
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });
        if (!user) throw new NotFoundException('User not found');

        // Upsert identity for this specific user
        await this.prisma.auth_identities.upsert({
            where: {
                provider_id_provider_user_id: {
                    provider_id: providerId,
                    provider_user_id: providerUserId,
                },
            },
            update: {
                user_id: userId,
                email: email ?? undefined,
                name: name ?? undefined,
                avatar_url: avatarUrl ?? undefined,
                updated_at: new Date(),
            },
            create: {
                id: crypto.randomUUID(),
                user_id: userId,
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

        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                is_verified: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
            },
        });
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
     * Unlink an external account (remove linked_accounts row) for a user and provider.
     * Also deletes areas and event_logs that depend on this specific provider to avoid FK errors.
     */
    async unlinkLinkedAccount(userId: string, provider: ProviderKeyEnum): Promise<void> {
        const providerId = await this.getOrCreateProviderIdByName(provider);

        await this.prisma.$transaction(async (tx) => {
            // Find the service that matches the provider name (e.g., 'spotify' provider -> 'spotify' service)
            const service = await tx.services.findFirst({
                where: {
                    name: {
                        equals: provider,
                        mode: 'insensitive'
                    }
                }
            });

            if (service) {
                // Find all actions and reactions for this service
                const actionsForService = await tx.actions.findMany({
                    where: { service_id: service.id },
                    select: { id: true }
                });

                const reactionsForService = await tx.reactions.findMany({
                    where: { service_id: service.id },
                    select: { id: true }
                });

                const actionIds = actionsForService.map(a => a.id);
                const reactionIds = reactionsForService.map(r => r.id);

                // Find areas that use this provider's actions or reactions
                const areasToDelete = await tx.areas.findMany({
                    where: {
                        user_id: userId,
                        OR: [
                            { action_id: { in: actionIds } },
                            { reaction_id: { in: reactionIds } }
                        ]
                    },
                    select: { id: true }
                });

                const areaIds = areasToDelete.map(a => a.id);

                // Delete event_logs for these specific areas
                if (areaIds.length > 0) {
                    await tx.event_logs.deleteMany({
                        where: { area_id: { in: areaIds } }
                    });

                    // Delete the areas
                    await tx.areas.deleteMany({
                        where: { id: { in: areaIds } }
                    });
                }
            }

            // Finally, delete the linked account
            await tx.linked_accounts.deleteMany({
                where: { user_id: userId, provider_id: providerId }
            });
        });
    }

    /**
     * Unlink an identity provider from a user, or delete the user if no password exists.
     * Only allows unlinking if the user has a password_hash (to prevent account lockout).
     * If no password_hash exists, deletes the user account entirely.
     */
    async unlinkIdentity(userId: string, provider: ProviderKeyEnum): Promise<{ deleted: boolean }> {
        // Get user with password_hash
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { id: true, password_hash: true, auth_identities: { select: { provider_id: true } } },
        });
        if (!user) throw new NotFoundException('User not found');

        const providerId = await this.getOrCreateProviderIdByName(provider);

        // Check if this identity exists
        const identity = await this.prisma.auth_identities.findUnique({
            where: { user_id_provider_id: { user_id: userId, provider_id: providerId } },
        });
        if (!identity) throw new NotFoundException('Identity not found for this provider');

        // If user has no password_hash, delete the entire user account
        if (!user.password_hash) {
            await this.prisma.users.delete({ where: { id: userId } });
            return { deleted: true };
        }

        // Otherwise, just unlink the identity
        await this.prisma.auth_identities.delete({
            where: { user_id_provider_id: { user_id: userId, provider_id: providerId } },
        });
        return { deleted: false };
    }
}

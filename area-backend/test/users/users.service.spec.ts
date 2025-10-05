import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProviderKeyEnum } from '../../src/common/interfaces/oauth2.type';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: PrismaService;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed',
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
    };

    const mockUserSelect = {
        id: true,
        email: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
    };

    const mockPrismaService = {
        users: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        oauth_providers: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        linked_accounts: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            update: jest.fn(),
        },
        auth_identities: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        services: {
            findFirst: jest.fn(),
        },
        actions: {
            findMany: jest.fn(),
        },
        reactions: {
            findMany: jest.fn(),
        },
        areas: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        event_logs: {
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all users without password_hash', async () => {
            const users = [mockUser, { ...mockUser, id: 'user-456' }];
            (prisma.users.findMany as jest.Mock).mockResolvedValue(users);

            const result = await service.findAll();

            expect(result).toEqual(users);
            expect(prisma.users.findMany).toHaveBeenCalledWith({
                select: expect.objectContaining({
                    id: true,
                    email: true,
                    is_verified: true,
                    is_active: true,
                }),
            });
        });
    });

    describe('findOne', () => {
        it('should return a user by id without password_hash', async () => {
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.findOne('user-123');

            expect(result).toEqual(mockUser);
            expect(prisma.users.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                select: expect.objectContaining(mockUserSelect),
            });
        });

        it('should throw NotFoundException when user not found', async () => {
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByEmail', () => {
        it('should return a user by email', async () => {
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.findByEmail('test@example.com');

            expect(result).toEqual(mockUser);
            expect(prisma.users.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });

        it('should return null when user not found', async () => {
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.findByEmail('not-found@example.com');

            expect(result).toBeNull();
        });
    });

    describe('createUser', () => {
        it('should create a new user', async () => {
            const createDto = {
                email: 'new@example.com',
                password_hash: 'hashed',
                is_verified: false,
            };
            (prisma.users.create as jest.Mock).mockResolvedValue({ ...mockUser, ...createDto });

            const result = await service.createUser(createDto);

            expect(result.email).toBe(createDto.email);
            expect(prisma.users.create).toHaveBeenCalledWith({
                data: {
                    email: createDto.email,
                    password_hash: createDto.password_hash,
                    is_verified: false,
                    is_active: true,
                },
            });
        });
    });

    describe('updateUser', () => {
        it('should update user and exclude password_hash from response', async () => {
            const updateDto = { email: 'updated@example.com' };
            const updatedUser = { ...mockUser, ...updateDto };
            (prisma.users.update as jest.Mock).mockResolvedValue(updatedUser);

            const result = await service.updateUser('user-123', updateDto);

            expect(result).toEqual(updatedUser);
            expect(prisma.users.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: updateDto,
                select: expect.objectContaining(mockUserSelect),
            });
        });
    });

    describe('deleteUser', () => {
        it('should delete user and related data in transaction', async () => {
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const tx = {
                    users: {
                        findUnique: jest.fn().mockResolvedValue(mockUser),
                        delete: jest.fn().mockResolvedValue(mockUser),
                    },
                    event_logs: { deleteMany: jest.fn() },
                    auth_identities: { deleteMany: jest.fn() },
                    linked_accounts: { deleteMany: jest.fn() },
                    areas: { deleteMany: jest.fn() },
                };
                return callback(tx);
            });

            const result = await service.deleteUser('user-123');

            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException when deleting non-existent user', async () => {
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const tx = {
                    users: { findUnique: jest.fn().mockResolvedValue(null) },
                };
                return callback(tx);
            });

            await expect(service.deleteUser('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.findById('user-123');

            expect(result).toEqual(mockUser);
        });
    });

    describe('findLinkedAccount', () => {
        it('should find linked account for user and provider', async () => {
            const linkedAccount = {
                id: 'linked-123',
                user_id: 'user-123',
                provider_id: 1,
                provider_user_id: 'google-123',
            };

            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
                id: 1,
                name: ProviderKeyEnum.Google,
            });
            (prisma.linked_accounts.findUnique as jest.Mock).mockResolvedValue(linkedAccount);

            const result = await service.findLinkedAccount('user-123', ProviderKeyEnum.Google);

            expect(result).toEqual(linkedAccount);
        });
    });

    describe('updateLinkedTokens', () => {
        it('should update linked account tokens', async () => {
            const tokenData = {
                accessToken: 'new-token',
                accessTokenExpiresAt: new Date(),
                refreshToken: 'new-refresh',
            };

            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
                id: 1,
                name: ProviderKeyEnum.Spotify,
            });
            (prisma.linked_accounts.update as jest.Mock).mockResolvedValue({});

            await service.updateLinkedTokens('user-123', ProviderKeyEnum.Spotify, tokenData);

            expect(prisma.linked_accounts.update).toHaveBeenCalledWith({
                where: {
                    user_id_provider_id: { user_id: 'user-123', provider_id: 1 },
                },
                data: expect.objectContaining({
                    access_token: 'new-token',
                    refresh_token: 'new-refresh',
                }),
            });
        });
    });

    describe('upsertIdentityForLogin', () => {
        it('should create new user and identity when user does not exist', async () => {
            const input = {
                provider: ProviderKeyEnum.Google,
                providerUserId: 'google-123',
                email: 'new@example.com',
                name: 'New User',
                avatarUrl: 'https://avatar.url',
            };

            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
                id: 1,
                name: ProviderKeyEnum.Google,
            });
            // Mock: identity doesn't exist (new user flow)
            (prisma.auth_identities.findUnique as jest.Mock).mockResolvedValue(null);
            // Mock: email doesn't exist
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.users.create as jest.Mock).mockResolvedValue({
                ...mockUser,
                email: input.email,
            });
            (prisma.auth_identities.create as jest.Mock).mockResolvedValue({});

            const result = await service.upsertIdentityForLogin(input);

            expect(result.email).toBe(input.email);
            expect(prisma.users.create).toHaveBeenCalled();
            expect(prisma.auth_identities.create).toHaveBeenCalled();
        });

        it('should login with existing identity', async () => {
            const input = {
                provider: ProviderKeyEnum.Google,
                providerUserId: 'google-123',
                email: 'test@example.com',
            };

            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
                id: 1,
                name: ProviderKeyEnum.Google,
            });
            // Mock: identity already exists (login flow)
            (prisma.auth_identities.findUnique as jest.Mock).mockResolvedValue({
                user_id: mockUser.id,
                users: mockUser,
            });
            (prisma.auth_identities.update as jest.Mock).mockResolvedValue({});

            const result = await service.upsertIdentityForLogin(input);

            expect(result).toEqual(mockUser);
            expect(prisma.users.create).not.toHaveBeenCalled();
            expect(prisma.auth_identities.update).toHaveBeenCalled();
        });
    });

    describe('linkExternalAccount', () => {
        it('should link external account to user', async () => {
            const input = {
                userId: 'user-123',
                provider: ProviderKeyEnum.Spotify,
                providerUserId: 'spotify-123',
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                scopes: 'user-read-email',
            };

            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
                id: 2,
                name: ProviderKeyEnum.Spotify,
            });
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.linked_accounts.upsert as jest.Mock).mockResolvedValue({});

            const result = await service.linkExternalAccount(input);

            expect(result).toEqual(mockUser);
            expect(prisma.linked_accounts.upsert).toHaveBeenCalled();
        });

        it('should throw NotFoundException when user not found', async () => {
            (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
            (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.linkExternalAccount({
                    userId: 'non-existent',
                    provider: ProviderKeyEnum.Spotify,
                    providerUserId: 'spotify-123',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('unlinkLinkedAccount', () => {
        const userId = 'user-123';
        const spotifyProviderId = 1;
        const googleProviderId = 2;
        const spotifyServiceId = 'service-spotify-id';
        const googleServiceId = 'service-google-id';
        const spotifyActionId = 'action-spotify-1';
        const googleActionId = 'action-google-1';
        const spotifyReactionId = 'reaction-spotify-1';
        const googleReactionId = 'reaction-google-1';
        const spotifyAreaId = 'area-spotify-1';
        const googleAreaId = 'area-google-1';

        beforeEach(() => {
            // Mock getOrCreateProviderIdByName
            mockPrismaService.oauth_providers.findFirst.mockResolvedValue({ id: spotifyProviderId });
        });

        it('should delete only areas and event_logs related to the unlinked provider', async () => {
            // Setup: Mock transaction to execute callback immediately
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const txMock = {
                    services: {
                        findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                    },
                    actions: {
                        findMany: jest.fn().mockResolvedValue([{ id: spotifyActionId }]),
                    },
                    reactions: {
                        findMany: jest.fn().mockResolvedValue([{ id: spotifyReactionId }]),
                    },
                    areas: {
                        findMany: jest.fn().mockResolvedValue([{ id: spotifyAreaId }]),
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                    event_logs: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
                    },
                    linked_accounts: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return await callback(txMock);
            });

            // Execute
            await service.unlinkLinkedAccount(userId, ProviderKeyEnum.Spotify);

            // Verify transaction was called
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

            // Get the transaction callback and verify its behavior
            const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
            const txMock = {
                services: {
                    findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                },
                actions: {
                    findMany: jest.fn().mockResolvedValue([{ id: spotifyActionId }]),
                },
                reactions: {
                    findMany: jest.fn().mockResolvedValue([{ id: spotifyReactionId }]),
                },
                areas: {
                    findMany: jest.fn().mockResolvedValue([{ id: spotifyAreaId }]),
                    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                },
                event_logs: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
                },
                linked_accounts: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                },
            };

            await txCallback(txMock);

            // Verify service lookup by provider name
            expect(txMock.services.findFirst).toHaveBeenCalledWith({
                where: {
                    name: {
                        equals: ProviderKeyEnum.Spotify,
                        mode: 'insensitive',
                    },
                },
            });

            // Verify actions and reactions for this service were fetched
            expect(txMock.actions.findMany).toHaveBeenCalledWith({
                where: { service_id: spotifyServiceId },
                select: { id: true },
            });
            expect(txMock.reactions.findMany).toHaveBeenCalledWith({
                where: { service_id: spotifyServiceId },
                select: { id: true },
            });

            // Verify areas lookup filtered by user and provider's actions/reactions
            expect(txMock.areas.findMany).toHaveBeenCalledWith({
                where: {
                    user_id: userId,
                    OR: [
                        { action_id: { in: [spotifyActionId] } },
                        { reaction_id: { in: [spotifyReactionId] } },
                    ],
                },
                select: { id: true },
            });

            // Verify event_logs deletion for specific areas
            expect(txMock.event_logs.deleteMany).toHaveBeenCalledWith({
                where: { area_id: { in: [spotifyAreaId] } },
            });

            // Verify areas deletion
            expect(txMock.areas.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: [spotifyAreaId] } },
            });

            // Verify linked_account deletion
            expect(txMock.linked_accounts.deleteMany).toHaveBeenCalledWith({
                where: { user_id: userId, provider_id: spotifyProviderId },
            });
        });

        it('should not delete areas if service is not found', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const txMock = {
                    services: {
                        findFirst: jest.fn().mockResolvedValue(null), // Service not found
                    },
                    actions: {
                        findMany: jest.fn(),
                    },
                    reactions: {
                        findMany: jest.fn(),
                    },
                    areas: {
                        findMany: jest.fn(),
                        deleteMany: jest.fn(),
                    },
                    event_logs: {
                        deleteMany: jest.fn(),
                    },
                    linked_accounts: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return await callback(txMock);
            });

            await service.unlinkLinkedAccount(userId, ProviderKeyEnum.Spotify);

            const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
            const txMock = {
                services: {
                    findFirst: jest.fn().mockResolvedValue(null),
                },
                actions: {
                    findMany: jest.fn(),
                },
                reactions: {
                    findMany: jest.fn(),
                },
                areas: {
                    findMany: jest.fn(),
                    deleteMany: jest.fn(),
                },
                event_logs: {
                    deleteMany: jest.fn(),
                },
                linked_accounts: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                },
            };

            await txCallback(txMock);

            // Should not query actions/reactions/areas if service not found
            expect(txMock.actions.findMany).not.toHaveBeenCalled();
            expect(txMock.reactions.findMany).not.toHaveBeenCalled();
            expect(txMock.areas.findMany).not.toHaveBeenCalled();
            expect(txMock.event_logs.deleteMany).not.toHaveBeenCalled();
            expect(txMock.areas.deleteMany).not.toHaveBeenCalled();

            // But should still delete the linked_account
            expect(txMock.linked_accounts.deleteMany).toHaveBeenCalledWith({
                where: { user_id: userId, provider_id: spotifyProviderId },
            });
        });

        it('should not delete event_logs or areas if no areas match the provider', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const txMock = {
                    services: {
                        findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                    },
                    actions: {
                        findMany: jest.fn().mockResolvedValue([{ id: spotifyActionId }]),
                    },
                    reactions: {
                        findMany: jest.fn().mockResolvedValue([{ id: spotifyReactionId }]),
                    },
                    areas: {
                        findMany: jest.fn().mockResolvedValue([]), // No areas found
                        deleteMany: jest.fn(),
                    },
                    event_logs: {
                        deleteMany: jest.fn(),
                    },
                    linked_accounts: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return await callback(txMock);
            });

            await service.unlinkLinkedAccount(userId, ProviderKeyEnum.Spotify);

            const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
            const txMock = {
                services: {
                    findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                },
                actions: {
                    findMany: jest.fn().mockResolvedValue([{ id: spotifyActionId }]),
                },
                reactions: {
                    findMany: jest.fn().mockResolvedValue([{ id: spotifyReactionId }]),
                },
                areas: {
                    findMany: jest.fn().mockResolvedValue([]),
                    deleteMany: jest.fn(),
                },
                event_logs: {
                    deleteMany: jest.fn(),
                },
                linked_accounts: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                },
            };

            await txCallback(txMock);

            // Should not delete event_logs or areas if areaIds is empty
            expect(txMock.event_logs.deleteMany).not.toHaveBeenCalled();
            expect(txMock.areas.deleteMany).not.toHaveBeenCalled();

            // But should still delete the linked_account
            expect(txMock.linked_accounts.deleteMany).toHaveBeenCalledWith({
                where: { user_id: userId, provider_id: spotifyProviderId },
            });
        });

        it('should handle provider with both actions and reactions', async () => {
            const multipleActions = [{ id: 'action-1' }, { id: 'action-2' }];
            const multipleReactions = [{ id: 'reaction-1' }, { id: 'reaction-2' }];
            const multipleAreas = [{ id: 'area-1' }, { id: 'area-2' }, { id: 'area-3' }];

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const txMock = {
                    services: {
                        findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                    },
                    actions: {
                        findMany: jest.fn().mockResolvedValue(multipleActions),
                    },
                    reactions: {
                        findMany: jest.fn().mockResolvedValue(multipleReactions),
                    },
                    areas: {
                        findMany: jest.fn().mockResolvedValue(multipleAreas),
                        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
                    },
                    event_logs: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
                    },
                    linked_accounts: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return await callback(txMock);
            });

            await service.unlinkLinkedAccount(userId, ProviderKeyEnum.Spotify);

            const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
            const txMock = {
                services: {
                    findFirst: jest.fn().mockResolvedValue({ id: spotifyServiceId, name: 'spotify' }),
                },
                actions: {
                    findMany: jest.fn().mockResolvedValue(multipleActions),
                },
                reactions: {
                    findMany: jest.fn().mockResolvedValue(multipleReactions),
                },
                areas: {
                    findMany: jest.fn().mockResolvedValue(multipleAreas),
                    deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
                },
                event_logs: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
                },
                linked_accounts: {
                    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                },
            };

            await txCallback(txMock);

            // Verify correct filtering with multiple IDs
            expect(txMock.areas.findMany).toHaveBeenCalledWith({
                where: {
                    user_id: userId,
                    OR: [
                        { action_id: { in: ['action-1', 'action-2'] } },
                        { reaction_id: { in: ['reaction-1', 'reaction-2'] } },
                    ],
                },
                select: { id: true },
            });

            expect(txMock.event_logs.deleteMany).toHaveBeenCalledWith({
                where: { area_id: { in: ['area-1', 'area-2', 'area-3'] } },
            });

            expect(txMock.areas.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['area-1', 'area-2', 'area-3'] } },
            });
        });
    });
});

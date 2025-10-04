import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProviderKeyEnum } from '../../src/common/interfaces/oauth2.type';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: PrismaService;

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
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            update: jest.fn(),
        },
        auth_identities: {
            findFirst: jest.fn(),
            upsert: jest.fn(),
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

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            users: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            auth_identities: {
              deleteMany: jest.fn(),
              upsert: jest.fn(),
            },
            linked_accounts: {
              deleteMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
            },
            oauth_providers: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
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
          auth_identities: { deleteMany: jest.fn() },
          linked_accounts: { deleteMany: jest.fn() },
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
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.users.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: input.email,
      });
      (prisma.auth_identities.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.upsertIdentityForLogin(input);

      expect(result.email).toBe(input.email);
      expect(prisma.users.create).toHaveBeenCalled();
      expect(prisma.auth_identities.upsert).toHaveBeenCalled();
    });

    it('should link identity to existing user', async () => {
      const input = {
        provider: ProviderKeyEnum.Google,
        providerUserId: 'google-123',
        email: 'test@example.com',
      };

      (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: ProviderKeyEnum.Google,
      });
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.auth_identities.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.upsertIdentityForLogin(input);

      expect(result).toEqual(mockUser);
      expect(prisma.users.create).not.toHaveBeenCalled();
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
    it('should unlink external account', async () => {
      (prisma.oauth_providers.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        name: ProviderKeyEnum.Spotify,
      });
      (prisma.linked_accounts.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.unlinkLinkedAccount('user-123', ProviderKeyEnum.Spotify);

      expect(prisma.linked_accounts.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123', provider_id: 2 },
      });
    });
  });
});

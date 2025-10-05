import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    is_verified: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('findMe', () => {
    it('should return the authenticated user profile', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.findMe('user-123');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should return user when accessing own profile', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123', 'user-123');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException when accessing another user profile', () => {
      expect(() => controller.findOne('user-456', 'user-123')).toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto = {
        email: 'new@example.com',
        password_hash: 'hashed-password',
      };

      (service.createUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...createDto,
      });

      const result = await controller.create(createDto);

      expect(result.email).toBe(createDto.email);
      expect(service.createUser).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update user when updating own profile', async () => {
      const updateDto = { email: 'updated@example.com' };
      const updatedUser = { ...mockUser, ...updateDto };

      (service.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateDto, 'user-123');

      expect(result).toEqual(updatedUser);
      expect(service.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should throw ForbiddenException when updating another user profile', () => {
      const updateDto = { email: 'updated@example.com' };

      expect(() => controller.update('user-456', updateDto, 'user-123')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete user when deleting own profile', async () => {
      (service.deleteUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.remove('user-123', 'user-123');

      expect(result).toEqual(mockUser);
      expect(service.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException when deleting another user profile', () => {
      expect(() => controller.remove('user-456', 'user-123')).toThrow(ForbiddenException);
    });
  });
});

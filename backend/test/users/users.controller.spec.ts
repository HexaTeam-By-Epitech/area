import { Test, TestingModule } from '@nestjs/testing';
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

  describe('updateMe', () => {
    it('should update the authenticated user profile', async () => {
      const updateDto = { is_active: false } as any;
      const updatedUser = { ...mockUser, ...updateDto };
      (service.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.updateMe(updateDto, 'user-123');

      expect(result).toEqual(updatedUser);
      expect(service.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });
  });

  describe('removeMe', () => {
    it('should delete the authenticated user account', async () => {
      (service.deleteUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.removeMe('user-123');

      expect(result).toEqual(mockUser);
      expect(service.deleteUser).toHaveBeenCalledWith('user-123');
    });
  });
});

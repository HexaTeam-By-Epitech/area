import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ManagerController } from '../../src/modules/manager/manager.controller';
import { ManagerService } from '../../src/modules/manager/manager.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ManagerController', () => {
  let controller: ManagerController;
  let service: ManagerService;
  let prisma: PrismaService;

  const mockActions = [
    { name: 'action1', callback: jest.fn(), description: 'Action 1 description' },
    { name: 'action2', callback: jest.fn(), description: 'Action 2 description' },
  ];

  const mockReactions = [
    { name: 'reaction1', callback: jest.fn(), description: 'Reaction 1 description' },
    { name: 'reaction2', callback: jest.fn(), description: 'Reaction 2 description' },
  ];

  const mockArea = {
    id: 'area-123',
    user_id: 'user-123',
    action_id: 'action-1',
    reaction_id: 'reaction-1',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManagerController],
      providers: [
        {
          provide: ManagerService,
          useValue: {
            getAvailableActions: jest.fn(),
            getAvailableReactions: jest.fn(),
            bindAction: jest.fn(),
            getUserAreas: jest.fn(),
            deactivateArea: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            areas: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ManagerController>(ManagerController);
    service = module.get<ManagerService>(ManagerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAvailableActions', () => {
    it('should return list of available actions', () => {
      (service.getAvailableActions as jest.Mock).mockReturnValue(mockActions);

      const result = controller.getAvailableActions();

      expect(result).toEqual([
        { name: 'action1', description: 'Action 1 description' },
        { name: 'action2', description: 'Action 2 description' },
      ]);
      expect(service.getAvailableActions).toHaveBeenCalled();
    });
  });

  describe('getAvailableReactions', () => {
    it('should return list of available reactions', () => {
      (service.getAvailableReactions as jest.Mock).mockReturnValue(mockReactions);

      const result = controller.getAvailableReactions();

      expect(result).toEqual([
        { name: 'reaction1', description: 'Reaction 1 description', configSchema: [] },
        { name: 'reaction2', description: 'Reaction 2 description', configSchema: [] },
      ]);
      expect(service.getAvailableReactions).toHaveBeenCalled();
    });
  });

  describe('bindAction', () => {
    it('should bind an action to a reaction', async () => {
      const bindDto = {
        actionName: 'action1',
        reactionName: 'reaction1',
        config: { key: 'value' },
      };

      (service.bindAction as jest.Mock).mockResolvedValue('area-123');

      const result = await controller.bindAction('user-123', bindDto);

      expect(result).toEqual({
        message: 'Area created successfully',
        areaId: 'area-123',
        userId: 'user-123',
        action: 'action1',
        reaction: 'reaction1',
        config: { key: 'value' },
      });

      expect(service.bindAction).toHaveBeenCalledWith(
        'user-123',
        'action1',
        'reaction1',
        { key: 'value' },
      );
    });

    it('should handle bind errors', async () => {
      const bindDto = {
        actionName: 'unknown_action',
        reactionName: 'reaction1',
        config: {},
      };

      (service.bindAction as jest.Mock).mockRejectedValue(
        new BadRequestException('Action not found'),
      );

      await expect(controller.bindAction('user-123', bindDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserAreas', () => {
    it('should return user areas', async () => {
      const areas = [
        {
          ...mockArea,
          actions: { name: 'action1' },
          reactions: { name: 'reaction1' },
        },
      ];

      (service.getUserAreas as jest.Mock).mockResolvedValue(areas);

      const result = await controller.getUserAreas('user-123');

      expect(result).toEqual(areas);
      expect(service.getUserAreas).toHaveBeenCalledWith('user-123');
    });
  });

  describe('deactivateArea', () => {
    it('should deactivate an area when user owns it', async () => {
      (prisma.areas.findUnique as jest.Mock).mockResolvedValue(mockArea);
      (service.deactivateArea as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.deactivateArea('area-123', 'user-123');

      expect(result).toEqual({
        message: 'Area deactivated successfully',
        areaId: 'area-123',
      });

      expect(service.deactivateArea).toHaveBeenCalledWith('area-123');
    });

    it('should throw BadRequestException when area not found', async () => {
      (prisma.areas.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(controller.deactivateArea('non-existent', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deactivateArea('non-existent', 'user-123')).rejects.toThrow(
        'Area not found',
      );
    });

    it('should throw ForbiddenException when user does not own area', async () => {
      const areaOwnedByOther = {
        ...mockArea,
        user_id: 'user-456',
      };

      (prisma.areas.findUnique as jest.Mock).mockResolvedValue(areaOwnedByOther);

      await expect(controller.deactivateArea('area-123', 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.deactivateArea('area-123', 'user-123')).rejects.toThrow(
        'You do not own this area',
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ManagerController } from '../../src/modules/manager/manager.controller';
import { ManagerService } from '../../src/modules/manager/manager.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ManagerController', () => {
  let controller: ManagerController;
  let service: ManagerService;
  let prisma: PrismaService;

  const mockActionsGrouped = {
    spotify: {
      isLinked: true,
      items: [
        { name: 'spotify_has_likes', description: 'Check if user has liked songs on Spotify' },
      ],
    },
    google: {
      isLinked: false,
      items: [
        { name: 'gmail_new_email', description: 'Detect new incoming email in Gmail inbox' },
      ],
    },
  };

  const mockReactionsGrouped = {
    google: {
      isLinked: true,
      items: [
        { name: 'send_email', description: 'Send email notification', configSchema: [] },
      ],
    },
    default: {
      isLinked: true,
      items: [
        { name: 'log_event', description: 'Log event to database', configSchema: [] },
      ],
    },
  };

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
            getAvailableActionsGrouped: jest.fn(),
            getAvailableReactionsGrouped: jest.fn(),
            bindAction: jest.fn(),
            getUserAreas: jest.fn(),
            deactivateArea: jest.fn(),
            getActionPlaceholders: jest.fn(),
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
    it('should return actions grouped by provider with link status', async () => {
      (service.getAvailableActionsGrouped as jest.Mock).mockResolvedValue(mockActionsGrouped);

      const result = await controller.getAvailableActions('user-123');

      expect(result).toEqual(mockActionsGrouped);
      expect(service.getAvailableActionsGrouped).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getAvailableReactions', () => {
    it('should return reactions grouped by provider with link status', async () => {
      (service.getAvailableReactionsGrouped as jest.Mock).mockResolvedValue(mockReactionsGrouped);

      const result = await controller.getAvailableReactions('user-123');

      expect(result).toEqual(mockReactionsGrouped);
      expect(service.getAvailableReactionsGrouped).toHaveBeenCalledWith('user-123');
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

  describe('getActionPlaceholders', () => {
    const mockPlaceholders = [
      {
        key: 'SPOTIFY_LIKED_SONG_NAME',
        description: 'The name of the liked song',
        example: 'Bohemian Rhapsody',
      },
      {
        key: 'SPOTIFY_LIKED_SONG_ARTIST',
        description: 'The artist(s) of the liked song',
        example: 'Queen',
      },
    ];

    it('should return placeholders for a valid action', () => {
      (service.getActionPlaceholders as jest.Mock).mockReturnValue(mockPlaceholders);

      const result = controller.getActionPlaceholders('spotify_has_likes');

      expect(result).toEqual(mockPlaceholders);
      expect(service.getActionPlaceholders).toHaveBeenCalledWith('spotify_has_likes');
    });

    it('should throw BadRequestException when action has no placeholders', () => {
      (service.getActionPlaceholders as jest.Mock).mockReturnValue([]);

      expect(() => controller.getActionPlaceholders('unknown_action')).toThrow(
        BadRequestException,
      );
      expect(() => controller.getActionPlaceholders('unknown_action')).toThrow(
        "No placeholders available for action 'unknown_action'",
      );
    });

    it('should throw BadRequestException when action returns null', () => {
      (service.getActionPlaceholders as jest.Mock).mockReturnValue(null);

      expect(() => controller.getActionPlaceholders('invalid_action')).toThrow(
        BadRequestException,
      );
    });
  });
});

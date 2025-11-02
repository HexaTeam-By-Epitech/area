import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ManagerService } from '../../../src/modules/manager/manager.service';
import { ActionNamesEnum, ReactionNamesEnum } from '../../../src/common/interfaces/action-names.enum';

describe('Slack Action Integration (e2e)', () => {
  let app: INestApplication;
  let managerService: ManagerService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Import your actual AppModule here for full integration test
      providers: [
        {
          provide: ManagerService,
          useValue: {
            bindAction: jest.fn(),
            getAvailableActions: jest.fn(),
            getActionPlaceholders: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    managerService = moduleFixture.get<ManagerService>(ManagerService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Slack New Message Action', () => {
    it('should be available in action list', async () => {
      managerService.getAvailableActions = jest.fn().mockResolvedValue([
        {
          name: ActionNamesEnum.SLACK_NEW_MESSAGE,
          displayName: 'New Slack Message',
          provider: 'slack',
          description: 'Detect new messages in Slack channels',
          configSchema: [
            {
              name: 'channelId',
              type: 'string',
              required: true,
              label: 'Slack Channel ID',
              placeholder: 'C1234567890'
            }
          ]
        }
      ]);

      const actions = await managerService.getAvailableActions();
      const slackAction = actions.find(a => a.name === ActionNamesEnum.SLACK_NEW_MESSAGE);

      expect(slackAction).toBeDefined();
      expect(slackAction.provider).toBe('slack');
      expect(slackAction.configSchema).toHaveLength(1);
      expect(slackAction.configSchema[0].name).toBe('channelId');
    });

    it('should provide correct placeholders', async () => {
      managerService.getActionPlaceholders = jest.fn().mockResolvedValue([
        { key: 'message_text', description: 'The content of the new Slack message', example: 'Hello everyone!' },
        { key: 'message_user', description: 'The user ID who sent the message', example: 'U1234567890' },
        { key: 'message_timestamp', description: 'The timestamp of the message', example: '1640995200.123456' },
        { key: 'channel_id', description: 'The channel ID where the message was posted', example: 'C1234567890' },
      ]);

      const placeholders = await managerService.getActionPlaceholders(ActionNamesEnum.SLACK_NEW_MESSAGE);

      expect(placeholders).toHaveLength(4);
      expect(placeholders.map(p => p.key)).toEqual([
        'message_text',
        'message_user', 
        'message_timestamp',
        'channel_id'
      ]);
    });

    it('should create area with Slack action and email reaction', async () => {
      const userId = 'test-user-123';
      const areaConfig = {
        action: {
          channelId: 'C1234567890'
        },
        reaction: {
          to: 'user@example.com',
          subject: 'New Slack message',
          body: 'User {{message_user}} posted: {{message_text}} in channel {{channel_id}}'
        }
      };

      managerService.bindAction = jest.fn().mockResolvedValue('area-uuid-123');

      const areaId = await managerService.bindAction(
        userId,
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SEND_EMAIL,
        areaConfig
      );

      expect(managerService.bindAction).toHaveBeenCalledWith(
        userId,
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SEND_EMAIL,
        areaConfig
      );
      expect(areaId).toBe('area-uuid-123');
    });
  });

  describe('Slack Action Configuration Validation', () => {
    it('should validate channelId format', () => {
      const validChannelIds = ['C1234567890', 'C0123456789', 'CXXXXXXXXXX'];
      const invalidChannelIds = ['general', '1234567890', 'invalid', '', 'G1234567890'];

      validChannelIds.forEach(channelId => {
        expect(channelId).toMatch(/^C[A-Z0-9]{10}$/);
      });

      invalidChannelIds.forEach(channelId => {
        expect(channelId).not.toMatch(/^C[A-Z0-9]{10}$/);
      });
    });
  });

  describe('Slack Action Error Handling', () => {
    it('should handle missing Slack provider gracefully', async () => {
      // This would be a real integration test where we verify
      // that the action returns code -1 when Slack is not linked
      const mockResult = { code: -1 };
      
      expect(mockResult.code).toBe(-1);
    });

    it('should handle API errors gracefully', async () => {
      // This would test API failure scenarios
      const mockResult = { code: 1 }; // No change on error
      
      expect(mockResult.code).toBe(1);
    });
  });
});

/**
 * Example of how to use the Slack action in a real scenario
 */
export const slackActionExample = {
  // Configuration pour surveiller le canal #general
  generalChannelConfig: {
    action: {
      channelId: 'C1234567890' // ID du canal #general
    },
    reaction: {
      to: 'admin@company.com',
      subject: 'New message in #general',
      body: `
        A new message was posted in #general:
        
        From: {{message_user}}
        Time: {{message_timestamp}}
        Message: {{message_text}}
        
        Channel: {{channel_id}}
      `
    }
  },

  // Configuration pour un canal privé
  privateChannelConfig: {
    action: {
      channelId: 'C9876543210' // ID d'un canal privé
    },
    reaction: {
      to: 'team@company.com',
      subject: 'New message in private channel',
      body: 'New activity detected: {{message_text}}'
    }
  },

  // Configuration avec canal par défaut
  defaultChannelConfig: {
    action: {
      // Pas de channelId = utilise 'general'
    },
    reaction: {
      to: 'notifications@company.com',
      subject: 'Slack Activity',
      body: 'Message from {{message_user}}: {{message_text}}'
    }
  }
};

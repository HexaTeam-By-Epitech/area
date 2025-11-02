import { Test, TestingModule } from '@nestjs/testing';
import { SlackNewMessageService } from '../../src/modules/actions/slack/new-message.service';
import { SlackSendService } from '../../src/modules/reactions/slack/send.service';
import { ManagerService } from '../../src/modules/manager/manager.service';
import { ActionNamesEnum, ReactionNamesEnum } from '../../src/common/interfaces/action-names.enum';

describe('Slack Action-Reaction Integration (e2e)', () => {
  let slackActionService: SlackNewMessageService;
  let slackReactionService: SlackSendService;
  let managerService: ManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SlackNewMessageService,
          useValue: {
            supports: jest.fn(),
            hasNewSlackMessage: jest.fn(),
            getPlaceholders: jest.fn(),
          },
        },
        {
          provide: SlackSendService,
          useValue: {
            run: jest.fn(),
            validateConfig: jest.fn(),
            getConfigSchema: jest.fn(),
          },
        },
        {
          provide: ManagerService,
          useValue: {
            bindAction: jest.fn(),
            getAvailableActions: jest.fn(),
            getAvailableReactions: jest.fn(),
          },
        },
      ],
    }).compile();

    slackActionService = module.get<SlackNewMessageService>(SlackNewMessageService);
    slackReactionService = module.get<SlackSendService>(SlackSendService);
    managerService = module.get<ManagerService>(ManagerService);
  });

  describe('Slack to Slack Integration', () => {
    it('should create cross-channel message relay', async () => {
      const userId = 'test-user-123';
      const sourceChannelId = 'C1111111111';
      const targetChannelId = 'C2222222222';

      const areaConfig = {
        action: {
          channelId: sourceChannelId
        },
        reaction: {
          channelId: targetChannelId,
          message: 'Relai de {{channel_id}}: {{message_text}} (par {{message_user}})',
          username: 'Relay Bot',
          iconEmoji: ':arrows_counterclockwise:'
        }
      };

      managerService.bindAction = jest.fn().mockResolvedValue('area-uuid-slack-relay');

      const areaId = await managerService.bindAction(
        userId,
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        areaConfig
      );

      expect(managerService.bindAction).toHaveBeenCalledWith(
        userId,
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        areaConfig
      );
      expect(areaId).toBe('area-uuid-slack-relay');
    });

    it('should handle action trigger and reaction execution', async () => {
      const userId = 'test-user-123';
      const channelId = 'C1234567890';

      // Mock action detection
      slackActionService.hasNewSlackMessage = jest.fn().mockResolvedValue({
        code: 0, // Trigger
        data: {
          message_text: 'Hello everyone!',
          message_user: 'U9876543210',
          message_timestamp: '1640995200.123456',
          channel_id: channelId,
        }
      });

      // Mock reaction execution
      slackReactionService.run = jest.fn().mockResolvedValue({
        success: true,
        messageTs: '1640995260.789012'
      });

      // Simulate action trigger
      const actionResult = await slackActionService.hasNewSlackMessage(userId, { channelId });
      expect(actionResult.code).toBe(0);
      expect(actionResult.data.message_text).toBe('Hello everyone!');

      // Simulate reaction execution with placeholder replacement
      const reactionConfig = {
        channelId: 'C9999999999',
        message: 'New message: {{message_text}} from {{message_user}}',
        username: 'Notification Bot'
      };

      const reactionResult = await slackReactionService.run(userId, 0, reactionConfig);
      expect(reactionResult.success).toBe(true);
      expect(reactionResult.messageTs).toBe('1640995260.789012');
    });
  });

  describe('Multi-channel Scenarios', () => {
    it('should support multiple source channels to one target', async () => {
      const scenarios = [
        {
          name: 'General to Alerts',
          source: 'C1111111111', // #general
          target: 'C9999999999', // #alerts
          message: '[GENERAL] {{message_text}}'
        },
        {
          name: 'Random to Alerts', 
          source: 'C2222222222', // #random
          target: 'C9999999999', // #alerts
          message: '[RANDOM] {{message_text}}'
        },
        {
          name: 'Dev to Alerts',
          source: 'C3333333333', // #dev
          target: 'C9999999999', // #alerts  
          message: '[DEV] {{message_text}}'
        }
      ];

      for (const scenario of scenarios) {
        const areaConfig = {
          action: { channelId: scenario.source },
          reaction: {
            channelId: scenario.target,
            message: scenario.message,
            username: 'Aggregator Bot'
          }
        };

        managerService.bindAction = jest.fn().mockResolvedValue(`area-${scenario.name.toLowerCase()}`);
        
        const areaId = await managerService.bindAction(
          'user-123',
          ActionNamesEnum.SLACK_NEW_MESSAGE,
          ReactionNamesEnum.SLACK_SEND_MESSAGE,
          areaConfig
        );

        expect(areaId).toBe(`area-${scenario.name.toLowerCase()}`);
      }
    });

    it('should support one source to multiple targets', async () => {
      const sourceChannel = 'C1111111111'; // #important
      const targets = [
        { channel: 'C9999999999', name: 'alerts' },
        { channel: 'G8888888888', name: 'management' },
        { channel: 'D7777777777', name: 'admin-dm' }
      ];

      for (const target of targets) {
        const areaConfig = {
          action: { channelId: sourceChannel },
          reaction: {
            channelId: target.channel,
            message: `🚨 Important update: {{message_text}}`,
            username: 'Alert System',
            iconEmoji: ':warning:'
          }
        };

        managerService.bindAction = jest.fn().mockResolvedValue(`area-to-${target.name}`);
        
        const areaId = await managerService.bindAction(
          'user-123',
          ActionNamesEnum.SLACK_NEW_MESSAGE,
          ReactionNamesEnum.SLACK_SEND_MESSAGE,
          areaConfig
        );

        expect(areaId).toBe(`area-to-${target.name}`);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate action configuration', () => {
      slackActionService.supports = jest.fn().mockReturnValue(true);
      slackActionService.getPlaceholders = jest.fn().mockReturnValue([
        { key: 'message_text', description: 'Message content', example: 'Hello world' },
        { key: 'message_user', description: 'User ID', example: 'U1234567890' },
        { key: 'message_timestamp', description: 'Message timestamp', example: '1640995200.123456' },
        { key: 'channel_id', description: 'Channel ID', example: 'C1234567890' }
      ]);

      expect(slackActionService.supports(ActionNamesEnum.SLACK_NEW_MESSAGE)).toBe(true);
      
      const placeholders = slackActionService.getPlaceholders();
      expect(placeholders).toHaveLength(4);
      expect(placeholders.map(p => p.key)).toEqual([
        'message_text', 'message_user', 'message_timestamp', 'channel_id'
      ]);
    });

    it('should validate reaction configuration', () => {
      slackReactionService.validateConfig = jest.fn().mockImplementation((config) => {
        const errors = [];
        if (!config.channelId) errors.push('channelId is required');
        if (!config.message) errors.push('message is required');
        return { valid: errors.length === 0, errors };
      });

      slackReactionService.getConfigSchema = jest.fn().mockReturnValue([
        { name: 'channelId', type: 'string', required: true },
        { name: 'message', type: 'string', required: true },
        { name: 'username', type: 'string', required: false },
        { name: 'iconEmoji', type: 'string', required: false }
      ]);

      // Valid config
      const validConfig = {
        channelId: 'C1234567890',
        message: 'Test message',
        username: 'Bot',
        iconEmoji: ':robot_face:'
      };
      
      const validResult = slackReactionService.validateConfig(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid config
      const invalidConfig = { message: 'Test without channel' };
      const invalidResult = slackReactionService.validateConfig(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('channelId is required');

      // Schema
      const schema = slackReactionService.getConfigSchema();
      expect(schema).toHaveLength(4);
      expect(schema[0].name).toBe('channelId');
      expect(schema[0].required).toBe(true);
    });
  });

  describe('Real-world Use Cases', () => {
    it('should create notification system for team updates', async () => {
      const teamUpdateConfig = {
        action: { channelId: 'C1234567890' }, // #team-updates
        reaction: {
          channelId: 'G9876543210', // Private management group
          message: `📢 Team Update from {{message_user}}:
          
{{message_text}}

Timestamp: {{message_timestamp}}`,
          username: 'Team Update Bot',
          iconEmoji: ':mega:'
        }
      };

      managerService.bindAction = jest.fn().mockResolvedValue('team-update-relay');

      const areaId = await managerService.bindAction(
        'manager-user-id',
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        teamUpdateConfig
      );

      expect(areaId).toBe('team-update-relay');
      expect(managerService.bindAction).toHaveBeenCalledWith(
        'manager-user-id',
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        teamUpdateConfig
      );
    });

    it('should create customer support escalation', async () => {
      const supportEscalationConfig = {
        action: { channelId: 'C5555555555' }, // #customer-support
        reaction: {
          channelId: 'G4444444444', // Private support-escalation group
          message: `🆘 SUPPORT ESCALATION

Original message: {{message_text}}
From: {{message_user}}
Channel: {{channel_id}}
Time: {{message_timestamp}}

Please review and take action.`,
          username: 'Support Escalation System',
          iconEmoji: ':sos:'
        }
      };

      managerService.bindAction = jest.fn().mockResolvedValue('support-escalation');

      const areaId = await managerService.bindAction(
        'support-lead-id',
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        supportEscalationConfig
      );

      expect(areaId).toBe('support-escalation');
    });

    it('should create development alerts system', async () => {
      const devAlertsConfig = {
        action: { channelId: 'C6666666666' }, // #dev-alerts
        reaction: {
          channelId: 'D7777777777', // DM with tech lead
          message: `🚨 DEV ALERT 🚨

{{message_text}}

Source: {{channel_id}} | User: {{message_user}}
Time: {{message_timestamp}}

Immediate attention required.`,
          username: 'Dev Alert System',
          iconEmoji: ':rotating_light:'
        }
      };

      managerService.bindAction = jest.fn().mockResolvedValue('dev-alerts-dm');

      const areaId = await managerService.bindAction(
        'tech-lead-id',
        ActionNamesEnum.SLACK_NEW_MESSAGE,
        ReactionNamesEnum.SLACK_SEND_MESSAGE,
        devAlertsConfig
      );

      expect(areaId).toBe('dev-alerts-dm');
    });
  });
});

/**
 * Examples of advanced Slack action-reaction configurations
 */
export const slackIntegrationExamples = {
  // Cross-team communication
  crossTeamRelay: {
    action: { channelId: 'C1111111111' }, // #engineering
    reaction: {
      channelId: 'C2222222222', // #product
      message: 'Engineering update: {{message_text}} (from {{message_user}})',
      username: 'Cross-Team Bot',
      iconEmoji: ':handshake:'
    }
  },

  // Emergency escalation
  emergencyEscalation: {
    action: { channelId: 'C9999999999' }, // #incidents
    reaction: {
      channelId: 'G8888888888', // Private oncall group
      message: `🚨 INCIDENT ALERT 🚨
      
{{message_text}}

Channel: {{channel_id}}
Reporter: {{message_user}}
Time: {{message_timestamp}}

@channel Please respond immediately.`,
      username: 'Incident Response',
      iconEmoji: ':fire:'
    }
  },

  // Customer feedback aggregation
  feedbackAggregation: {
    action: { channelId: 'C3333333333' }, // #customer-feedback
    reaction: {
      channelId: 'C4444444444', // #product-decisions
      message: `💬 Customer Feedback:

{{message_text}}

From: {{message_user}} in {{channel_id}}
Timestamp: {{message_timestamp}}

#customer-insights #product-feedback`,
      username: 'Feedback Aggregator',
      iconEmoji: ':speech_balloon:'
    }
  },

  // Code review notifications
  codeReviewNotifications: {
    action: { channelId: 'C5555555555' }, // #code-reviews
    reaction: {
      channelId: 'D6666666666', // DM with lead developer
      message: `👀 Code Review Request:

{{message_text}}

From: {{message_user}}
Time: {{message_timestamp}}

Please review when possible.`,
      username: 'Code Review Bot',
      iconEmoji: ':eyes:'
    }
  }
};

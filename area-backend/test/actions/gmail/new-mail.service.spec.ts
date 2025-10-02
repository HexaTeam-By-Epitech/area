import { Test, TestingModule } from '@nestjs/testing';
import { GmailNewMailService } from '../../../src/modules/actions/gmail/new-mail.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

// Mocks
const mockUsersService = { findLinkedAccount: jest.fn() };
const mockAuthService = { oAuth2ApiRequest: jest.fn() };
const mockRedisService = { getValue: jest.fn(), setValue: jest.fn() };

describe('GmailNewMailService', () => {
  let service: GmailNewMailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailNewMailService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GmailNewMailService>(GmailNewMailService);
  });

  describe('supports', () => {
    it('should support gmail_new_mail action', () => {
      expect(service.supports('gmail_new_mail')).toBe(true);
      expect(service.supports('other_action')).toBe(false);
    });
  });

  describe('hasNewGmailEmail', () => {
    const userId = 'user-1';

    it('should return -1 when gmail provider not linked', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue(null);
      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(-1);
      expect(mockUsersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Google);
    });

    it('should baseline first seen email and return 1 (no trigger)', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue(null);
      // list -> one message
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm1', threadId: 't1' }] }, status: 200 })
        // get message metadata
        .mockResolvedValueOnce({ data: { internalDate: '1730388000000' }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388000000');
    });

    it('should detect new email and return 0 when internalDate newer', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm2', threadId: 't2' }] }, status: 200 })
        .mockResolvedValueOnce({ data: { internalDate: '1730388100000' }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(0);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388100000');
    });

    it('should return 1 when internalDate unchanged', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm3', threadId: 't3' }] }, status: 200 })
        .mockResolvedValueOnce({ data: { internalDate: '1730388000000' }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(1);
      expect(mockRedisService.setValue).not.toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388000000');
    });

    it('should return 1 and cache empty string when inbox empty', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [] }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '');
    });

    it('should return 1 if metadata lacks internalDate', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm4', threadId: 't4' }] }, status: 200 })
        .mockResolvedValueOnce({ data: { }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(1);
    });

    it('should detect new email when previous state was empty inbox (cached empty string)', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      // cached empty string indicates previous empty inbox baseline
      mockRedisService.getValue.mockResolvedValue('');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'mEmptyToNew', threadId: 't' }] }, status: 200 })
        .mockResolvedValueOnce({ data: { internalDate: '1731000000000' }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result).toBe(0);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1731000000000');
    });
  });
});

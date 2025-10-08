import { Test, TestingModule } from '@nestjs/testing';
import { GmailNewMailService } from '../../../src/modules/actions/gmail/new-mail.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';
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
      expect(service.supports(ActionNamesEnum.GMAIL_NEW_EMAIL)).toBe(true);
      expect(service.supports('other_action')).toBe(false);
    });
  });

  describe('hasNewGmailEmail', () => {
    const userId = 'user-1';

    it('should return code -1 when gmail provider not linked', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue(null);
      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(-1);
      expect(mockUsersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Google);
    });

    it('should baseline first seen email and return code 1 (no trigger)', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue(null);
      // list -> one message
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm1', threadId: 't1' }] }, status: 200 })
        // get full message with headers and body
        .mockResolvedValueOnce({
          data: {
            internalDate: '1730388000000',
            payload: {
              headers: [
                { name: 'From', value: 'sender@example.com' },
                { name: 'To', value: 'recipient@example.com' },
                { name: 'Subject', value: 'Test email' },
              ],
              body: { data: Buffer.from('Test body').toString('base64') },
            },
            snippet: 'Test body',
          },
          status: 200,
        });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388000000');
    });

    it('should detect new email and return code 0 with data when internalDate newer', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm2', threadId: 't2' }] }, status: 200 })
        .mockResolvedValueOnce({
          data: {
            internalDate: '1730388100000',
            payload: {
              headers: [
                { name: 'From', value: 'new-sender@example.com' },
                { name: 'To', value: 'me@example.com' },
                { name: 'Subject', value: 'New important email' },
              ],
              body: { data: Buffer.from('This is the body of the new email').toString('base64') },
            },
            snippet: 'This is the body of the new email',
          },
          status: 200,
        });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(0);
      expect(result.data).toEqual({
        GMAIL_NEW_EMAIL_ID: 'm2',
        GMAIL_NEW_EMAIL_INTERNAL_DATE: '1730388100000',
        GMAIL_NEW_EMAIL_FROM: 'new-sender@example.com',
        GMAIL_NEW_EMAIL_TO: 'me@example.com',
        GMAIL_NEW_EMAIL_SUBJECT: 'New important email',
        GMAIL_NEW_EMAIL_SNIPPET: 'This is the body of the new email',
        GMAIL_NEW_EMAIL_BODY: 'This is the body of the new email',
      });
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388100000');
    });

    it('should return code 1 when internalDate unchanged', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm3', threadId: 't3' }] }, status: 200 })
        .mockResolvedValueOnce({
          data: {
            internalDate: '1730388000000',
            payload: {
              headers: [{ name: 'From', value: 'sender@example.com' }],
              body: { data: Buffer.from('Body').toString('base64') },
            },
            snippet: 'Body',
          },
          status: 200,
        });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(1);
      expect(mockRedisService.setValue).not.toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1730388000000');
    });

    it('should return code 1 and cache empty string when inbox empty', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [] }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(1);
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '');
    });

    it('should return code 1 if metadata lacks internalDate', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      mockRedisService.getValue.mockResolvedValue('1730388000000');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'm4', threadId: 't4' }] }, status: 200 })
        .mockResolvedValueOnce({ data: { }, status: 200 });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(1);
    });

    it('should detect new email when previous state was empty inbox (cached empty string)', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'acc' });
      // cached empty string indicates previous empty inbox baseline
      mockRedisService.getValue.mockResolvedValue('');
      mockAuthService.oAuth2ApiRequest
        .mockResolvedValueOnce({ data: { messages: [{ id: 'mEmptyToNew', threadId: 't' }] }, status: 200 })
        .mockResolvedValueOnce({
          data: {
            internalDate: '1731000000000',
            payload: {
              headers: [
                { name: 'From', value: 'first-sender@example.com' },
                { name: 'To', value: 'me@example.com' },
                { name: 'Subject', value: 'First email after empty' },
              ],
              body: { data: Buffer.from('First email content').toString('base64') },
            },
            snippet: 'First email content',
          },
          status: 200,
        });

      const result = await service.hasNewGmailEmail(userId);
      expect(result.code).toBe(0);
      expect(result.data).toEqual({
        GMAIL_NEW_EMAIL_ID: 'mEmptyToNew',
        GMAIL_NEW_EMAIL_INTERNAL_DATE: '1731000000000',
        GMAIL_NEW_EMAIL_FROM: 'first-sender@example.com',
        GMAIL_NEW_EMAIL_TO: 'me@example.com',
        GMAIL_NEW_EMAIL_SUBJECT: 'First email after empty',
        GMAIL_NEW_EMAIL_SNIPPET: 'First email content',
        GMAIL_NEW_EMAIL_BODY: 'First email content',
      });
      expect(mockRedisService.setValue).toHaveBeenCalledWith(`gmail:last_email_internal_date:${userId}`, '1731000000000');
    });
  });

  describe('getPlaceholders', () => {
    it('should return list of Gmail placeholders', () => {
      const placeholders = service.getPlaceholders();
      expect(placeholders).toHaveLength(7);
      expect(placeholders[0].key).toBe('GMAIL_NEW_EMAIL_ID');
      expect(placeholders[1].key).toBe('GMAIL_NEW_EMAIL_INTERNAL_DATE');
      expect(placeholders[2].key).toBe('GMAIL_NEW_EMAIL_FROM');
      expect(placeholders[3].key).toBe('GMAIL_NEW_EMAIL_TO');
      expect(placeholders[4].key).toBe('GMAIL_NEW_EMAIL_SUBJECT');
      expect(placeholders[5].key).toBe('GMAIL_NEW_EMAIL_SNIPPET');
      expect(placeholders[6].key).toBe('GMAIL_NEW_EMAIL_BODY');
    });
  });
});

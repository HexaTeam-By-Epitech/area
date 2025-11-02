import { Test, TestingModule } from '@nestjs/testing';
import { GoogleDriveNewFileService } from '../../../src/modules/actions/google-drive/new-file.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';

describe('GoogleDriveNewFileService', () => {
  let service: GoogleDriveNewFileService;
  let authService: AuthService;
  let usersService: UsersService;
  let redisService: RedisService;

  const mockAuthService = {
    oAuth2ApiRequest: jest.fn(),
  };

  const mockUsersService = {
    findLinkedAccount: jest.fn(),
  };

  const mockRedisService = {
    getValue: jest.fn(),
    setValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleDriveNewFileService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GoogleDriveNewFileService>(GoogleDriveNewFileService);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any active intervals
    const intervals = (service as any).pollIntervals as Map<string, NodeJS.Timeout>;
    intervals.forEach((interval) => clearInterval(interval));
    intervals.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for GDRIVE_NEW_FILE action', () => {
      expect(service.supports(ActionNamesEnum.GDRIVE_NEW_FILE)).toBe(true);
    });

    it('should return false for other actions', () => {
      expect(service.supports(ActionNamesEnum.SPOTIFY_HAS_LIKES)).toBe(false);
      expect(service.supports(ActionNamesEnum.GMAIL_NEW_EMAIL)).toBe(false);
    });
  });

  describe('start', () => {
    it('should start polling for a user', () => {
      const userId = 'user-123';
      const emit = jest.fn();

      service.start(userId, emit);

      // Verify that interval was set
      const intervals = (service as any).pollIntervals;
      expect(intervals.has(userId)).toBe(true);
    });
  });

  describe('stop', () => {
    it('should stop polling for a user', () => {
      const userId = 'user-123';
      const emit = jest.fn();

      // Start first
      service.start(userId, emit);

      // Then stop
      service.stop(userId);

      // Verify that interval was cleared
      const intervals = (service as any).pollIntervals;
      expect(intervals.has(userId)).toBe(false);
    });

    it('should handle stopping non-existent polling', () => {
      const userId = 'user-123';

      // Should not throw
      expect(() => service.stop(userId)).not.toThrow();
    });
  });

  describe('hasNewFile', () => {
    const userId = 'user-123';

    it('should return null if no linked Google Drive account', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue(null);

      const result = await service.hasNewFile(userId);

      expect(result).toEqual({ code: -1 });
      expect(mockAuthService.oAuth2ApiRequest).not.toHaveBeenCalled();
    });

    it('should return code 1 if no new files', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({
        id: 'linked-account-123',
        provider_id: 3,
        user_id: userId,
      });
      mockRedisService.getValue.mockResolvedValue(new Date().toISOString());
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          files: [],
        },
      });

      const result = await service.hasNewFile(userId);

      expect(result).toEqual({ code: 1 });
    });

    it('should return file data when new files exist', async () => {
      const now = new Date();
      const lastCheckTime = new Date(now.getTime() - 3600000); // 1 hour ago

      mockUsersService.findLinkedAccount.mockResolvedValue({
        id: 'linked-account-123',
        provider_id: 3,
        user_id: userId,
      });
      mockRedisService.getValue.mockResolvedValue(lastCheckTime.toISOString());

      const mockFiles = [
        {
          id: 'file-1',
          name: 'Test Document.pdf',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive.google.com/file/d/file-1/view',
          size: '1048576',
          createdTime: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
        },
        {
          id: 'file-2',
          name: 'Spreadsheet.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          webViewLink: 'https://drive.google.com/file/d/file-2/view',
          size: '524288',
          createdTime: new Date(now.getTime() - 900000).toISOString(), // 15 min ago
        },
      ];

      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          files: mockFiles,
        },
      });

      const result = await service.hasNewFile(userId);

      expect(result).toBeDefined();
      expect(result?.data).toBeDefined();
      expect(result?.data?.GDRIVE_FILE_ID).toBe('file-1');
      expect(result?.data?.GDRIVE_FILE_NAME).toBe('Test Document.pdf');
      expect(result?.data?.GDRIVE_FILE_TYPE).toBe('application/pdf');
      expect(result?.data?.GDRIVE_FILE_LINK).toBe('https://drive.google.com/file/d/file-1/view');
      expect(result?.data?.GDRIVE_FILE_SIZE).toBe('1048576');
      expect(result?.data?.GDRIVE_FILES_COUNT).toBe('2');
      expect(mockRedisService.setValue).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({
        id: 'linked-account-123',
        provider_id: 3,
        user_id: userId,
      });
      mockRedisService.getValue.mockResolvedValue(new Date().toISOString());
      mockAuthService.oAuth2ApiRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.hasNewFile(userId);

      expect(result).toEqual({ code: -1 });
    });

    it('should use current time as lastCheck if not in Redis', async () => {
      mockUsersService.findLinkedAccount.mockResolvedValue({
        id: 'linked-account-123',
        provider_id: 3,
        user_id: userId,
      });
      mockRedisService.getValue.mockResolvedValue(null);
      mockAuthService.oAuth2ApiRequest.mockResolvedValue({
        data: {
          files: [],
        },
      });

      await service.hasNewFile(userId);

      // Should have saved current time to Redis
      expect(mockRedisService.setValue).toHaveBeenCalled();
      const setCall = mockRedisService.setValue.mock.calls[0];
      expect(setCall[0]).toContain('gdrive:lastCheck:');
    });
  });

  describe('getPlaceholders', () => {
    it('should return correct placeholders', () => {
      const placeholders = service.getPlaceholders();

      expect(placeholders).toHaveLength(7);
      
      const keys = placeholders.map(p => p.key);
      expect(keys).toContain('GDRIVE_FILE_ID');
      expect(keys).toContain('GDRIVE_FILE_NAME');
      expect(keys).toContain('GDRIVE_FILE_TYPE');
      expect(keys).toContain('GDRIVE_FILE_LINK');
      expect(keys).toContain('GDRIVE_FILE_SIZE');
      expect(keys).toContain('GDRIVE_FILE_CREATED');
      expect(keys).toContain('GDRIVE_FILES_COUNT');
    });
  });
});

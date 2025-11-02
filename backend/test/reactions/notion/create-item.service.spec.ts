import { Test, TestingModule } from '@nestjs/testing';
import { NotionCreateDatabaseItemService } from '../../../src/modules/reactions/notion/create-item.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

const mockUsersService = {
  findLinkedAccount: jest.fn(),
};

const mockAuthService = {
  oAuth2ApiRequest: jest.fn(),
};

describe('NotionCreateDatabaseItemService', () => {
  let service: NotionCreateDatabaseItemService;
  let usersService: typeof mockUsersService;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionCreateDatabaseItemService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get(NotionCreateDatabaseItemService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('run', () => {
    const userId = 'user-1';
    const databaseId = 'db-123';

    it('throws when Notion not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);
      await expect(
        service.run(userId, { databaseId, titlePropertyName: 'Name', title: 'Hello' })
      ).rejects.toThrow('Notion account not linked');
    });

    it('creates page with title convenience fields', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ id: 'la' });
      authService.oAuth2ApiRequest.mockResolvedValue({ data: { id: 'page-1' }, status: 200 });

      await service.run(userId, { databaseId, titlePropertyName: 'Name', title: 'My Title' });

      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Notion,
        userId,
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.notion.com/v1/pages',
          data: expect.objectContaining({
            parent: { database_id: databaseId },
            properties: expect.objectContaining({
              Name: expect.objectContaining({ title: expect.any(Array) })
            })
          })
        })
      );
    });

    it('creates page with propertiesJson if provided', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ id: 'la' });
      authService.oAuth2ApiRequest.mockResolvedValue({ data: { id: 'page-2' }, status: 200 });

      const propertiesJson = JSON.stringify({ Name: { title: [{ text: { content: 'From JSON' } }] } });
      await service.run(userId, { databaseId, propertiesJson });

      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Notion,
        userId,
        expect.objectContaining({
          data: expect.objectContaining({
            properties: JSON.parse(propertiesJson)
          })
        })
      );
    });

    it('rejects invalid propertiesJson', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ id: 'la' });
      await expect(
        service.run(userId, { databaseId, propertiesJson: '[]' })
      ).rejects.toThrow('Invalid propertiesJson');
    });

    it('replaces NOW tokens in date properties (string date)', async () => {
      jest.useFakeTimers();
      const fixed = new Date('2024-01-02T03:04:05.000Z');
      jest.setSystemTime(fixed);
      usersService.findLinkedAccount.mockResolvedValue({ id: 'la' });
      authService.oAuth2ApiRequest.mockResolvedValue({ data: { id: 'page-3' }, status: 200 });

      const propertiesJson = JSON.stringify({
        Due: { date: 'NOW' }
      });
      await service.run(userId, { databaseId, propertiesJson });

      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Notion,
        userId,
        expect.objectContaining({
          data: expect.objectContaining({
            properties: expect.objectContaining({
              Due: { date: { start: fixed.toISOString() } }
            })
          })
        })
      );

      jest.useRealTimers();
    });

    it('replaces NOW tokens in date properties (object start/end)', async () => {
      jest.useFakeTimers();
      const fixed = new Date('2024-02-03T04:05:06.000Z');
      jest.setSystemTime(fixed);
      usersService.findLinkedAccount.mockResolvedValue({ id: 'la' });
      authService.oAuth2ApiRequest.mockResolvedValue({ data: { id: 'page-4' }, status: 200 });

      const propertiesJson = JSON.stringify({
        Deadline: { date: { start: '__NOW__', end: '{{NOW}}' } }
      });
      await service.run(userId, { databaseId, propertiesJson });

      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Notion,
        userId,
        expect.objectContaining({
          data: expect.objectContaining({
            properties: expect.objectContaining({
              Deadline: { date: { start: fixed.toISOString(), end: fixed.toISOString() } }
            })
          })
        })
      );

      jest.useRealTimers();
    });
  });

  describe('getFields', () => {
    it('returns config fields', () => {
      const fields = service.getFields();
      expect(fields).toEqual([
        { name: 'databaseId', type: 'string', required: true },
        { name: 'titlePropertyName', type: 'string', required: false },
        { name: 'title', type: 'string', required: false },
        { name: 'propertiesJson', type: 'string', required: false },
      ]);
    });
  });
});

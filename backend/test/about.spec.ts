import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { ManagerService } from '../src/modules/manager/manager.service';
import type { Request } from 'express';

describe('AppController - about.json', () => {
  let appController: AppController;
  let appService: AppService;
  let managerService: ManagerService;

  const mockManagerService = {
    getServicesForAbout: jest.fn(() => [
      {
        name: 'spotify',
        actions: [
          {
            name: 'spotify_has_likes',
            description: 'Check if user has liked songs on Spotify'
          }
        ],
        reactions: []
      },
      {
        name: 'google',
        actions: [
          {
            name: 'gmail_new_email',
            description: 'Detect new incoming email in Gmail inbox'
          }
        ],
        reactions: [
          {
            name: 'send_email',
            description: 'Send email notification'
          }
        ]
      }
    ])
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ManagerService,
          useValue: mockManagerService
        }
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    managerService = module.get<ManagerService>(ManagerService);
  });

  describe('/about.json', () => {
    it('should return about.json with correct structure', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('server');
      expect(result.client).toHaveProperty('host');
      expect(result.server).toHaveProperty('current_time');
      expect(result.server).toHaveProperty('services');
      expect(Array.isArray(result.server.services)).toBe(true);
    });

    it('should extract client IP from X-Forwarded-For header', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '10.101.53.35, 192.168.1.1'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      expect(result.client.host).toBe('10.101.53.35');
    });

    it('should extract client IP from X-Real-IP header', () => {
      const mockRequest = {
        headers: {
          'x-real-ip': '192.168.1.100'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      expect(result.client.host).toBe('192.168.1.100');
    });

    it('should fallback to socket remoteAddress', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      expect(result.client.host).toBe('127.0.0.1');
    });

    it('should return current time as Unix timestamp', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;
 
      const beforeTime = Math.floor(Date.now() / 1000);
      const result = appController.getAbout(mockRequest);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(result.server.current_time).toBeGreaterThanOrEqual(beforeTime);
      expect(result.server.current_time).toBeLessThanOrEqual(afterTime);
    });

    it('should include services with actions and reactions', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      expect(result.server.services.length).toBeGreaterThan(0);
      
      const firstService = result.server.services[0];
      expect(firstService).toHaveProperty('name');
      expect(firstService).toHaveProperty('actions');
      expect(firstService).toHaveProperty('reactions');
      expect(Array.isArray(firstService.actions)).toBe(true);
      expect(Array.isArray(firstService.reactions)).toBe(true);
    });

    it('should include action name and description', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      const result = appController.getAbout(mockRequest);

      const serviceWithActions = result.server.services.find(s => s.actions.length > 0);
      expect(serviceWithActions).toBeDefined();

      if (serviceWithActions) {
        const action = serviceWithActions.actions[0];
        expect(action).toHaveProperty('name');
        expect(action).toHaveProperty('description');
        expect(typeof action.name).toBe('string');
        expect(typeof action.description).toBe('string');
      }
    });

    it('should call ManagerService.getServicesForAbout', () => {
      const mockRequest = {
        headers: {},
        socket: {
          remoteAddress: '127.0.0.1'
        }
      } as unknown as Request;

      appController.getAbout(mockRequest);

      expect(mockManagerService.getServicesForAbout).toHaveBeenCalled();
    });
  });
});


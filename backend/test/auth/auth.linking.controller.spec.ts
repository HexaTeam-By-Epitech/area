import { Test, TestingModule } from '@nestjs/testing';
import { GenericAuthLinkingController } from '../../src/modules/auth/controllers/auth.linking.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
  buildAuthUrl: jest.fn(),
  handleOAuthCallback: jest.fn(),
  unlinkProvider: jest.fn(),
  listProviders: jest.fn(),
  getLinkedProviders: jest.fn(),
};

describe('GenericAuthLinkingController', () => {
  let controller: GenericAuthLinkingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericAuthLinkingController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(GenericAuthLinkingController);
    jest.clearAllMocks();
  });

  it('getAuthUrl: should return url from service', () => {
    mockAuthService.buildAuthUrl.mockReturnValue('https://provider/link?x=y');
    const res = controller.getAuthUrl('spotify', 'u1');
    expect(mockAuthService.buildAuthUrl).toHaveBeenCalledWith('spotify', { userId: 'u1' });
    expect(res).toEqual({ url: 'https://provider/link?x=y' });
  });

  it('startOAuth: should redirect to url', async () => {
    mockAuthService.buildAuthUrl.mockReturnValue('https://provider/link');
    const redirect = jest.fn();
    const res: any = { redirect };
    await controller.startOAuth(res, 'spotify', 'u1');
    expect(mockAuthService.buildAuthUrl).toHaveBeenCalledWith('spotify', { userId: 'u1' });
    expect(redirect).toHaveBeenCalledWith('https://provider/link');
  });

  it('callback: should delegate to service and redirect on success', async () => {
    mockAuthService.handleOAuthCallback.mockResolvedValue({ accessToken: 'jwt', userId: 'u1', email: 'e' });
    const redirect = jest.fn();
    const res: any = { redirect };
    await controller.callback(res, 'spotify', 'code', 'state');
    expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith('spotify', 'code', 'state');
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/home/services?provider=spotify&status=success'));
  });

  it('callback: should redirect with error on failure', async () => {
    mockAuthService.handleOAuthCallback.mockRejectedValue(new Error('Link failed'));
    const redirect = jest.fn();
    const res: any = { redirect };
    await controller.callback(res, 'spotify', 'code', 'state');
    expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith('spotify', 'code', 'state');
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/home/services?provider=spotify&status=error'));
  });

  it('unlink: should call service and return payload', async () => {
    mockAuthService.unlinkProvider.mockResolvedValue({ provider: 'spotify', userId: 'u1' });
    const out = await controller.unlink('spotify', 'u1');
    expect(mockAuthService.unlinkProvider).toHaveBeenCalledWith('spotify', 'u1');
    expect(out).toEqual({ provider: 'spotify', userId: 'u1' });
  });

  describe('getAvailableProviders', () => {
    it('should return all public providers (filtering out _bot providers)', () => {
      mockAuthService.listProviders.mockReturnValue(['google', 'spotify', 'slack', 'slack_bot']);
      const res = controller.getAvailableProviders();
      expect(mockAuthService.listProviders).toHaveBeenCalled();
      expect(res).toEqual({ providers: ['google', 'spotify', 'slack'] });
    });

    it('should return empty array if no providers', () => {
      mockAuthService.listProviders.mockReturnValue([]);
      const res = controller.getAvailableProviders();
      expect(res).toEqual({ providers: [] });
    });

    it('should handle providers without _bot suffix', () => {
      mockAuthService.listProviders.mockReturnValue(['google', 'spotify']);
      const res = controller.getAvailableProviders();
      expect(res).toEqual({ providers: ['google', 'spotify'] });
    });
  });

  describe('getLinkedProviders', () => {
    it('should return linked providers from service', async () => {
      mockAuthService.getLinkedProviders.mockResolvedValue({ providers: ['google', 'slack'] });
      const res = await controller.getLinkedProviders('u1');
      expect(mockAuthService.getLinkedProviders).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ providers: ['google', 'slack'] });
    });
  });
});

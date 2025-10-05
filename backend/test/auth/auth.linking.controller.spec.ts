import { Test, TestingModule } from '@nestjs/testing';
import { GenericAuthLinkingController } from '../../src/modules/auth/controllers/auth.linking.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
  buildAuthUrl: jest.fn(),
  handleOAuthCallback: jest.fn(),
  unlinkProvider: jest.fn(),
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

  it('callback: should delegate to service', async () => {
    mockAuthService.handleOAuthCallback.mockResolvedValue({ accessToken: 'jwt', userId: 'u1', email: 'e' });
    const out = await controller.callback('spotify', 'code', 'state');
    expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith('spotify', 'code', 'state');
    expect(out).toEqual({ accessToken: 'jwt', userId: 'u1', email: 'e' });
  });

  it('unlink: should call service and return payload', async () => {
    mockAuthService.unlinkProvider.mockResolvedValue({ provider: 'spotify', userId: 'u1' });
    const out = await controller.unlink('spotify', 'u1');
    expect(mockAuthService.unlinkProvider).toHaveBeenCalledWith('spotify', 'u1');
    expect(out).toEqual({ provider: 'spotify', userId: 'u1' });
  });
});

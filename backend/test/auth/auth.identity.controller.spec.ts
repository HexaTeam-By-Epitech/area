import { Test, TestingModule } from '@nestjs/testing';
import { GenericAuthIdentityController } from '../../src/modules/auth/controllers/auth.identity.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
  signInWithIdToken: jest.fn(),
  buildLoginUrl: jest.fn(),
  handleLoginCallback: jest.fn(),
};

describe('GenericAuthIdentityController', () => {
  let controller: GenericAuthIdentityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericAuthIdentityController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(GenericAuthIdentityController);
    jest.clearAllMocks();
  });

  it('loginWithIdToken: should call service and return result', async () => {
    mockAuthService.signInWithIdToken.mockResolvedValue({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
    const res = await controller.loginWithIdToken('google', 'idtoken');
    expect(mockAuthService.signInWithIdToken).toHaveBeenCalledWith('google', 'idtoken');
    expect(res).toEqual({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
  });

  it('startLogin: should redirect to provider url', async () => {
    mockAuthService.buildLoginUrl.mockReturnValue('https://provider/login');
    const redirect = jest.fn();
    const res: any = { redirect };
    const req: any = {};
    await controller.startLogin(res, req, 'google');
    expect(mockAuthService.buildLoginUrl).toHaveBeenCalledWith('google', undefined);
    expect(redirect).toHaveBeenCalledWith('https://provider/login');
  });

  it('loginCallback: should call service and return result', async () => {
    mockAuthService.handleLoginCallback.mockResolvedValue({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
    const res = await controller.loginCallback('google', 'code123', 'state');
    expect(mockAuthService.handleLoginCallback).toHaveBeenCalledWith('google', 'code123', 'state');
    expect(res).toEqual({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
  });

  it('getLoginUrl: should return provider oauth login url', () => {
    mockAuthService.buildLoginUrl.mockReturnValue('https://provider/login');
    const req: any = {};
    const res = controller.getLoginUrl('google', req);
    expect(mockAuthService.buildLoginUrl).toHaveBeenCalledWith('google', undefined);
    expect(res).toEqual({ url: 'https://provider/login' });
  });

  it('startLogin with userId: should redirect with state in url', async () => {
    mockAuthService.buildLoginUrl.mockReturnValue('https://provider/login?state=abc');
    const redirect = jest.fn();
    const res: any = { redirect };
    const req: any = { user: { sub: 'user-123' } };
    await controller.startLogin(res, req, 'google');
    expect(mockAuthService.buildLoginUrl).toHaveBeenCalledWith('google', { userId: 'user-123' });
    expect(redirect).toHaveBeenCalledWith('https://provider/login?state=abc');
  });

  it('getLoginUrl with userId: should return url with state', () => {
    mockAuthService.buildLoginUrl.mockReturnValue('https://provider/login?state=abc');
    const req: any = { user: { sub: 'user-123' } };
    const res = controller.getLoginUrl('google', req);
    expect(mockAuthService.buildLoginUrl).toHaveBeenCalledWith('google', { userId: 'user-123' });
    expect(res).toEqual({ url: 'https://provider/login?state=abc' });
  });
});

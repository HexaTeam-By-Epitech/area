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
    await controller.startLogin(res, 'google');
    expect(mockAuthService.buildLoginUrl).toHaveBeenCalledWith('google');
    expect(redirect).toHaveBeenCalledWith('https://provider/login');
  });

  it('loginCallback: should call service and return result', async () => {
    mockAuthService.handleLoginCallback.mockResolvedValue({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
    const res = await controller.loginCallback('google', 'code123', 'state');
    expect(mockAuthService.handleLoginCallback).toHaveBeenCalledWith('google', 'code123', 'state');
    expect(res).toEqual({ accessToken: 'app.jwt', userId: 'u1', email: 'a@a.com' });
  });
});

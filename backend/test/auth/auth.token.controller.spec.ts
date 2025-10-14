import { Test, TestingModule } from '@nestjs/testing';
import { GenericAuthTokenController } from '../../src/modules/auth/controllers/auth.token.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
  refreshAccessToken: jest.fn(),
};

describe('GenericAuthTokenController', () => {
  let controller: GenericAuthTokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenericAuthTokenController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(GenericAuthTokenController);
    jest.clearAllMocks();
  });

  it('refresh: should delegate to service and wrap response', async () => {
    mockAuthService.refreshAccessToken.mockResolvedValue({ accessToken: 'tok', expiresIn: 3600 });
    const out = await controller.refresh('spotify', 'u1');
    expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('spotify', 'u1');
    expect(out).toEqual({ message: 'Refreshed', accessToken: 'tok', expiresIn: 3600 });
  });

  it('refresh: should propagate service errors', async () => {
    const err = new Error('nope');
    mockAuthService.refreshAccessToken.mockRejectedValue(err);
    await expect(controller.refresh('spotify', 'u1')).rejects.toThrow('nope');
  });
});

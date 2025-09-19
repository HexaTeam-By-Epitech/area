import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
};

describe('AuthController', () => {
    let controller: AuthController;
    let authService: typeof mockAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get(AuthService);
        jest.clearAllMocks();
    });

    it('register: should return userId', async () => {
        authService.register.mockResolvedValue({ id: '1' });
        const res = await controller.register({ email: 'a@a.com', password: 'password' });
        expect(res).toEqual({ message: 'User registered', userId: '1' });
    });

    it('login: should return userId', async () => {
        authService.validateUser.mockResolvedValue({ id: '2' });
        const res = await controller.login({ email: 'b@b.com', password: 'password' });
        expect(res).toEqual({ message: 'Login successful', userId: '2' });
    });
});

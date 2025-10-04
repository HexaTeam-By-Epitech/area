import { Test, TestingModule } from '@nestjs/testing';
import { AuthEmailController } from '../../src/modules/auth/auth.email.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
};

describe('AuthEmailController', () => {
    let controller: AuthEmailController;
    let authService: typeof mockAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthEmailController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        controller = module.get<AuthEmailController>(AuthEmailController);
        authService = module.get(AuthService);
        jest.clearAllMocks();
    });

    it('register: should return userId', async () => {
        authService.register.mockResolvedValue({ id: '1' });
        const res = await controller.register({ email: 'a@a.com', password: 'password' });
        expect(res).toEqual({ message: 'User registered successfully. Please check your email for verification code.', userId: '1' });
    });

    it('login: should return JWT and user info', async () => {
        authService.validateUser.mockResolvedValue({
            accessToken: 'jwt-token',
            userId: '2',
            email: 'b@b.com'
        });
        const res = await controller.login({ email: 'b@b.com', password: 'password' });
        expect(res).toEqual({
            message: 'Login successful',
            accessToken: 'jwt-token',
            userId: '2',
            email: 'b@b.com'
        });
    });
});

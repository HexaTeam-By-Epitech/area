import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import * as bcrypt from 'bcrypt';

const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;
    let usersService: typeof mockUsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should throw if email already exists', async () => {
            usersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com' });
            await expect(service.register('a@a.com', 'password'))
                .rejects.toThrow('Email already in use');
        });

        it('should create user if email is free', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            const hashedPassword = await bcrypt.hash('password', 10);
            usersService.createUser.mockResolvedValue({ id: '2', email: 'b@b.com', password_hash: hashedPassword });

            const user = await service.register('b@b.com', 'password');
            expect(user.id).toEqual('2');
            expect(user.email).toEqual('b@b.com');
        });
    });

    describe('validateUser', () => {
        it('should throw if user not found', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            await expect(service.validateUser('x@x.com', 'password'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should throw if password is invalid', async () => {
            const hashedPassword = await bcrypt.hash('correct', 10);
            usersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@a.com', password_hash: hashedPassword });
            await expect(service.validateUser('a@a.com', 'wrong'))
                .rejects.toThrow('Invalid credentials');
        });

        it('should return user if password is valid', async () => {
            const hashedPassword = await bcrypt.hash('correct', 10);
            const user = { id: '1', email: 'a@a.com', password_hash: hashedPassword };
            usersService.findByEmail.mockResolvedValue(user);

            const result = await service.validateUser('a@a.com', 'correct');
            expect(result).toEqual(user);
        });
    });
});

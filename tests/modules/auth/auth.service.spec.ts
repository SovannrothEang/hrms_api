import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../../src/modules/iam/users/users.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

const mockPrismaService = {
    user: {
        findFirst: jest.fn(),
    },
};

const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
};

const mockUsersService = {
    createAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;
    let prisma: PrismaService;
    let jwt: JwtService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: UsersService, useValue: mockUsersService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = module.get<PrismaService>(PrismaService);
        jwt = module.get<JwtService>(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('signInAsync', () => {
        it('should return access token', async () => {
            const user = {
                id: '1', email: 'test@test.com', password: 'hashed',
                userRoles: [{ role: { name: 'ADMIN' } }]
            };
            (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('token');

            const result = await service.signInAsync('test@test.com', 'pass');
            expect(result).toHaveProperty('access_token', 'token');
        });

        it('should throw if user not found', async () => {
            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            await expect(service.signInAsync('a', 'b')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if password mismatch', async () => {
            const user = { id: '1', password: 'hashed' };
            (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            await expect(service.signInAsync('a', 'b')).rejects.toThrow(UnauthorizedException);
        });
    });
});

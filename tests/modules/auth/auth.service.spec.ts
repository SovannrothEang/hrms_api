import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../../src/modules/iam/users/users.service';
import { SessionService } from '../../../src/common/security/services/session.service';
import { CsrfService } from '../../../src/common/security/services/csrf.service';
import { SecurityEventService } from '../../../src/common/security/services/security-event.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

const mockPrismaClient = {
    user: {
        findFirst: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
};

const mockUsersService = {
    createAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
};

const mockSessionService = {
    createSession: jest.fn(),
    validateSession: jest.fn(),
    invalidateSession: jest.fn(),
    invalidateAllUserSessions: jest.fn(),
    getUserSessions: jest.fn(),
    refreshSession: jest.fn(),
};

const mockCsrfService = {
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    rotateToken: jest.fn(),
    invalidateToken: jest.fn(),
};

const mockSecurityEventService = {
    logEvent: jest.fn(),
    logLoginSuccess: jest.fn(),
    logLoginFailed: jest.fn(),
    logLogout: jest.fn(),
    logSuspiciousActivity: jest.fn(),
    getFailedLoginAttempts: jest.fn().mockReturnValue(0),
};

describe('AuthService', () => {
    let service: AuthService;
    let prismaClient: typeof mockPrismaClient;
    let jwt: JwtService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: UsersService, useValue: mockUsersService },
                { provide: SessionService, useValue: mockSessionService },
                { provide: CsrfService, useValue: mockCsrfService },
                {
                    provide: SecurityEventService,
                    useValue: mockSecurityEventService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prismaClient = mockPrismaClient;
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
                id: '1',
                email: 'test@test.com',
                password: 'hashed',
                userRoles: [{ role: { name: 'ADMIN' } }],
            };
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (mockJwtService.signAsync as jest.Mock).mockResolvedValue('token');

            const result = await service.signInAsync('test@test.com', 'pass');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().token).toBe('token');
        });

        it('should throw if user not found', async () => {
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);
            await expect(service.signInAsync('a', 'b')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw if password mismatch', async () => {
            const user = { id: '1', password: 'hashed' };
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            await expect(service.signInAsync('a', 'b')).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});

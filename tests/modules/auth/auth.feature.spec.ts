import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { CookieService } from '../../../src/common/security/services/cookie.service';

jest.mock('src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'admin-id', roles: ['ADMIN'] };
            return true;
        }
    },
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() {
            return true;
        }
    },
}));
jest.mock('src/common/security/guards/session.guard', () => ({
    SessionGuard: class {
        canActivate() {
            return true;
        }
    },
}));
jest.mock('src/common/security/guards/csrf.guard', () => ({
    CsrfGuard: class {
        canActivate() {
            return true;
        }
    },
    SKIP_CSRF_KEY: 'skipCsrf',
}));

const mockService = {
    signInAsync: jest.fn(),
    signInSecureAsync: jest.fn(),
    getMe: jest.fn(),
    logoutAsync: jest.fn(),
    logoutAllSessionsAsync: jest.fn(),
    refreshTokenSecureAsync: jest.fn(),
    getUserSessionsAsync: jest.fn(),
};

const mockCookieService = {
    setAllAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
    setAccessTokenCookie: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    setCsrfTokenCookie: jest.fn(),
    setSessionIdCookie: jest.fn(),
};

describe('AuthController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockService },
                { provide: CookieService, useValue: mockCookieService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/auth/login (POST) should login', () => {
        mockService.signInSecureAsync.mockResolvedValue(
            Result.ok({
                tokens: {
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    csrfToken: 'csrf-token',
                    sessionId: 'session-id',
                    expiresAt: Date.now() + 3600000,
                },
                user: {
                    id: '1',
                    email: 'test@test.com',
                    username: 'testuser',
                    roles: ['ADMIN'],
                },
            }),
        );
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'pass' })
            .expect(200)
            .expect((res) => {
                expect(res.body.accessToken).toBe('access-token');
                expect(res.body.user).toBeDefined();
                expect(res.body.expiresAt).toBeDefined();
            });
    });

    it('/auth/me (GET) should return profile', () => {
        mockService.getMe.mockResolvedValue(Result.ok({ id: '1' }));
        return request(app.getHttpServer()).get('/auth/me').expect(200);
    });
});

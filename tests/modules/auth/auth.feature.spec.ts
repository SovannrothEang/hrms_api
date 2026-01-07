import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Mock Guards
jest.mock('src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'admin-id', roles: ['ADMIN'] };
            return true;
        }
    }
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() { return true; }
    }
}));

const mockService = {
    signInAsync: jest.fn(),
    getMe: jest.fn(),
};

describe('AuthController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/auth/login (POST) should login', () => {
        mockService.signInAsync.mockResolvedValue({ access_token: 'token' });
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'pass' })
            .expect(200)
            .expect({ access_token: 'token' });
    });

    it('/auth/me (GET) should return profile', () => {
        mockService.getMe.mockResolvedValue(Result.ok({ id: '1' }));
        return request(app.getHttpServer())
            .get('/auth/me')
            .expect(200);
    });
});

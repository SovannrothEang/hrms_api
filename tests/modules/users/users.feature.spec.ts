import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { UsersController } from '../../../src/modules/iam/users/users.controller';
import { UsersService } from '../../../src/modules/iam/users/users.service';
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
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('UsersController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                { provide: UsersService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/users (POST) should create user', () => {
        const dto = { username: 'john', email: 'john@example.com', password: 'password' };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1', ...dto }));

        return request(app.getHttpServer())
            .post('/users')
            .send(dto)
            .expect(201);
    });

    it('/users (GET) should return list', () => {
        mockService.findAllAsync.mockResolvedValue([]);
        return request(app.getHttpServer())
            .get('/users')
            .expect(200);
    });
});

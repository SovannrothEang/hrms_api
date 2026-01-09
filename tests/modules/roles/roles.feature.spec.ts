import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { RolesController } from 'src/modules/iam/roles/roles.controller';
import { RolesService } from 'src/modules/iam/roles/roles.service';

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

describe('RolesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [RolesController],
            providers: [
                { provide: RolesService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/roles (POST) should create role', () => {
        const dto = { roleName: 'MANAGER' };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1', name: 'MANAGER' }));

        return request(app.getHttpServer())
            .post('/roles')
            .send(dto)
            .expect(201);
    });

    it('/roles (GET) should return list', () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        return request(app.getHttpServer())
            .get('/roles')
            .expect(200);
    });
});

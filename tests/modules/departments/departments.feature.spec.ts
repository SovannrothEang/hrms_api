import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { DepartmentsController } from '../../../src/modules/departments/departments.controller';
import { DepartmentsService } from '../../../src/modules/departments/departments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Mock Guards global replacement
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
    findAllWithEmployeeAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('DepartmentsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [DepartmentsController],
            providers: [
                { provide: DepartmentsService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/departments (POST) should create department', () => {
        const dto = { name: 'Engineering' };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1', ...dto }));

        return request(app.getHttpServer())
            .post('/departments')
            .send(dto)
            .expect(201);
    });

    it('/departments (GET) should return list', () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        return request(app.getHttpServer())
            .get('/departments')
            .expect(200);
    });
});

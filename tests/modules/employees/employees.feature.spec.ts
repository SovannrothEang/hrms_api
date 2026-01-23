import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { EmployeesController } from '../../../src/modules/employees/employees.controller';
import { EmployeesService } from '../../../src/modules/employees/employees.service';
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
    },
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() {
            return true;
        }
    },
}));

const mockService = {
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findAllPaginatedAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('EmployeesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [EmployeesController],
            providers: [{ provide: EmployeesService, useValue: mockService }],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/employees (POST) should create employee', () => {
        const dto = {
            username: 'john',
            email: 'john@example.com',
            password: 'pass',
            employeeCode: 'EMP001',
            firstname: 'John',
            lastname: 'Doe',
            gender: 1,
            dob: '1990-01-01',
            hireDate: '2020-01-01',
            departmentId: 'dep-1',
            positionId: 'pos-1',
            roleId: 'role-1',
        };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1' }));

        return request(app.getHttpServer())
            .post('/employees')
            .send(dto)
            .expect(201);
    });

    it('/employees (GET) should return list', () => {
        mockService.findAllPaginatedAsync.mockResolvedValue(
            Result.ok({ data: [], totalPages: 0, totalCount: 0, page: 1 }),
        );
        return request(app.getHttpServer()).get('/employees').expect(200);
    });
});

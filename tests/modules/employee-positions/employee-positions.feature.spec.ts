import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { EmployeePositionsController } from '../../../src/modules/employee-positions/employee-positions.controller';
import { EmployeePositionsService } from '../../../src/modules/employee-positions/employee-positions.service';
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
    createEmployeePosition: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateEmployeePosition: jest.fn(),
    deleteEmployeePositionAsync: jest.fn(),
};

describe('EmployeePositionsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [EmployeePositionsController],
            providers: [
                { provide: EmployeePositionsService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/employees/positions (POST) should create position', () => {
        const dto = { title: 'Developer', salaryRangeMin: 1000, salaryRangeMax: 2000 };
        mockService.createEmployeePosition.mockResolvedValue(Result.ok({ id: '1', ...dto }));

        return request(app.getHttpServer())
            .post('/employees/positions')
            .send(dto)
            .expect(201);
    });

    it('/employees/positions (GET) should return list', () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        return request(app.getHttpServer())
            .get('/employees/positions')
            .expect(200);
    });
});

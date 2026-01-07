import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { ResultPagination } from '../../../src/common/logic/result-pagination';
import { LeavesController } from '../../../src/modules/leaves/leaves.controller';
import { LeavesService } from '../../../src/modules/leaves/leaves.service';
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
    findAllPaginatedAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateStatusAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('LeavesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [LeavesController],
            providers: [
                { provide: LeavesService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/takeleave (POST) should create request', () => {
        const dto = { employeeId: 'emp-1', leaveType: 'ANNUAL', startDate: '2023-01-01', endDate: '2023-01-02' };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1' }));

        return request(app.getHttpServer())
            .post('/takeleave')
            .send(dto)
            .expect(201);
    });

    it('/takeleave (GET) should list', () => {
        mockService.findAllPaginatedAsync.mockResolvedValue(Result.ok(ResultPagination.of([], 0, 1, 10)));
        return request(app.getHttpServer())
            .get('/takeleave')
            .expect(200);
    });
});

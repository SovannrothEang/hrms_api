import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { ResultPagination } from '../../../src/common/logic/result-pagination';
import { ErrorCode } from '../../../src/common/enums/error-codes.enum';
import { LeavesController } from '../../../src/modules/leaves/leaves.controller';
import { LeavesService } from '../../../src/modules/leaves/leaves.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';

// Mock Guards
jest.mock('../../../src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'admin-id', roles: ['ADMIN'] };
            return true;
        }
    },
}));
jest.mock('../../../src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() {
            return true;
        }
    },
}));

const mockService = {
    createAsync: jest.fn(),
    findAllFilteredAsync: jest.fn(),
    findAllPaginatedAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    updateStatusAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('LeavesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await NestTest.createTestingModule(
            {
                controllers: [LeavesController],
                providers: [{ provide: LeavesService, useValue: mockService }],
            },
        ).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/leave-requests (POST) should create request', async () => {
        const dto = {
            employeeId: 'emp-1',
            leaveType: 'ANNUAL',
            startDate: '2023-01-01',
            endDate: '2023-01-02',
        };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1' }));

        await request(app.getHttpServer())
            .post('/leave-requests')
            .send(dto)
            .expect(201);
    });

    it('/leave-requests (GET) should list', async () => {
        mockService.findAllPaginatedAsync.mockResolvedValue(
            Result.ok(ResultPagination.of([], 0, 1, 10)),
        );
        await request(app.getHttpServer())
            .get('/leave-requests')
            .expect(200)
            .expect({
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0,
                    hasNext: false,
                    hasPrevious: false,
                },
            });
    });

    it('/leave-requests/:id (GET) should return single leave', async () => {
        mockService.findOneByIdAsync.mockResolvedValue(Result.ok({ id: '1' }));
        await request(app.getHttpServer()).get('/leave-requests/1').expect(200);
    });

    it('/leave-requests/:id (GET) not found returns Result with isSuccess false', async () => {
        mockService.findOneByIdAsync.mockResolvedValue(
            Result.fail('Not found', ErrorCode.NOT_FOUND),
        );
        await request(app.getHttpServer())
            .get('/leave-requests/non-existent')
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Not found');
            });
    });

    it('/leave-requests/:id/status (PATCH) should update status', async () => {
        mockService.updateStatusAsync.mockResolvedValue(
            Result.ok({ id: '1', status: 'APPROVED' }),
        );
        await request(app.getHttpServer())
            .patch('/leave-requests/1/status')
            .send({ status: 'APPROVED', approverId: 'admin' })
            .expect(200);
    });

    it('/leave-requests/:id (DELETE) should delete leave', async () => {
        mockService.deleteAsync.mockResolvedValue(Result.ok());
        await request(app.getHttpServer())
            .delete('/leave-requests/1')
            .expect(204);
    });

    it('/leave-requests/:id (DELETE) should return 400 on service failure', async () => {
        mockService.deleteAsync.mockResolvedValue(Result.fail('Cannot delete'));
        await request(app.getHttpServer())
            .delete('/leave-requests/1')
            .expect(400);
    });

    it('/leave-requests (POST) should return 400 on service failure', async () => {
        const dto = {
            employeeId: 'emp-1',
            leaveType: 'ANNUAL',
            startDate: '2023-01-01',
            endDate: '2023-01-02',
        };
        mockService.createAsync.mockResolvedValue(Result.fail('Overlap'));
        await request(app.getHttpServer())
            .post('/leave-requests')
            .send(dto)
            .expect(400);
    });
});

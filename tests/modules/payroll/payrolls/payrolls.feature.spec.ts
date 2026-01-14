// Mock Guards global replacement
jest.mock('src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'user-id-123', roles: ['ADMIN'] };
            return true;
        }
    }
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() { return true; }
    }
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PayrollsController } from '../../../../src/modules/payroll/payrolls/payrolls.controller';
import { PayrollsService, PayrollStatus } from '../../../../src/modules/payroll/payrolls/payrolls.service';
import { Result } from '../../../../src/common/logic/result';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

const mockPayrollsService = {
    createDraftAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findByIdAsync: jest.fn(),
    finalizeAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('PayrollsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [PayrollsController],
            providers: [
                { provide: PayrollsService, useValue: mockPayrollsService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /payrolls/process', () => {
        const dto = {
            employeeId: 'emp-1',
            payPeriodStart: '2026-01-01',
            payPeriodEnd: '2026-01-31',
            currencyCode: 'USD',
            overtimeHours: 10,
            bonus: 500,
        };

        it('should create draft payroll successfully', () => {
            const responseDto = {
                id: 'payroll-1',
                ...dto,
                status: PayrollStatus.PENDING,
                netSalary: 2850,
            };

            mockPayrollsService.createDraftAsync.mockResolvedValue(Result.ok(responseDto));

            return request(app.getHttpServer())
                .post('/payrolls/process')
                .send(dto)
                .expect(201)
                .expect((res) => {
                    expect(res.body.id).toBe('payroll-1');
                    expect(res.body.status).toBe(PayrollStatus.PENDING);
                });
        });

        it('should return 500 on service failure', () => {
            mockPayrollsService.createDraftAsync.mockResolvedValue(
                Result.fail('Employee not found'),
            );

            return request(app.getHttpServer())
                .post('/payrolls/process')
                .send(dto)
                .expect(500);
        });
    });

    describe('GET /payrolls', () => {
        it('should return list of payrolls', () => {
            const payrolls = [
                { id: 'payroll-1', status: PayrollStatus.PENDING },
                { id: 'payroll-2', status: PayrollStatus.PROCESSED },
            ];

            mockPayrollsService.findAllAsync.mockResolvedValue(Result.ok(payrolls));

            return request(app.getHttpServer())
                .get('/payrolls')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(2);
                });
        });

        it('should pass query parameters to service', async () => {
            mockPayrollsService.findAllAsync.mockResolvedValue(Result.ok([]));

            await request(app.getHttpServer())
                .get('/payrolls?employeeId=emp-1&status=PENDING&year=2026&month=1')
                .expect(200);

            expect(mockPayrollsService.findAllAsync).toHaveBeenCalledWith({
                employeeId: 'emp-1',
                status: 'PENDING',
                year: 2026,
                month: 1,
            });
        });
    });

    describe('GET /payrolls/:id', () => {
        it('should return single payroll', () => {
            const payroll = {
                id: 'payroll-1',
                status: PayrollStatus.PENDING,
                items: [],
                taxCalculation: null,
            };

            mockPayrollsService.findByIdAsync.mockResolvedValue(Result.ok(payroll));

            return request(app.getHttpServer())
                .get('/payrolls/payroll-1')
                .expect(200)
                .expect((res) => {
                    expect(res.body.id).toBe('payroll-1');
                });
        });

        it('should return 500 when not found', () => {
            mockPayrollsService.findByIdAsync.mockResolvedValue(
                Result.fail('Payroll not found'),
            );

            return request(app.getHttpServer())
                .get('/payrolls/non-existent')
                .expect(500);
        });
    });

    describe('PATCH /payrolls/:id/finalize', () => {
        it('should finalize pending payroll', () => {
            const finalized = {
                id: 'payroll-1',
                status: PayrollStatus.PROCESSED,
            };

            mockPayrollsService.finalizeAsync.mockResolvedValue(Result.ok(finalized));

            return request(app.getHttpServer())
                .patch('/payrolls/payroll-1/finalize')
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe(PayrollStatus.PROCESSED);
                });
        });

        it('should return 500 on finalize failure', () => {
            mockPayrollsService.finalizeAsync.mockResolvedValue(
                Result.fail('Cannot finalize'),
            );

            return request(app.getHttpServer())
                .patch('/payrolls/payroll-1/finalize')
                .expect(500);
        });
    });

    describe('DELETE /payrolls/:id', () => {
        it('should delete pending payroll', () => {
            mockPayrollsService.deleteAsync.mockResolvedValue(Result.ok());

            return request(app.getHttpServer())
                .delete('/payrolls/payroll-1')
                .expect(204);
        });

        it('should return 500 on delete failure', () => {
            mockPayrollsService.deleteAsync.mockResolvedValue(
                Result.fail('Only PENDING payrolls can be deleted'),
            );

            return request(app.getHttpServer())
                .delete('/payrolls/payroll-1')
                .expect(500);
        });
    });
});

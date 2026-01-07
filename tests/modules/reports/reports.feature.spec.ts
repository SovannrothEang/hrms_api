import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ReportsController } from '../../../src/modules/reports/reports.controller';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ResultPagination } from '../../../src/common/logic/result-pagination';
import * as ExcelJS from 'exceljs';

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
    getAttendanceSummaryData: jest.fn(),
    exportAttendanceSummary: jest.fn(),
    getPaginatedLeaveUtilization: jest.fn(),
    exportLeaveUtilization: jest.fn(),
};

describe('ReportsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ReportsController],
            providers: [
                { provide: ReportsService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/reports/attendance-summary (GET)', () => {
        mockService.getAttendanceSummaryData.mockResolvedValue([{ status: 'PRESENT', count: 1 }]);
        return request(app.getHttpServer())
            .get('/reports/attendance-summary?month=1&year=2023')
            .expect(200);
    });

    it('/reports/leave-utilization (GET)', () => {
        mockService.getPaginatedLeaveUtilization.mockResolvedValue(ResultPagination.of([], 0, 1, 10));
        return request(app.getHttpServer())
            .get('/reports/leave-utilization')
            .expect(200);
    });

    it('/reports/attendance-summary/export (GET)', async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Summary');
        mockService.exportAttendanceSummary.mockResolvedValue(workbook);

        await request(app.getHttpServer())
            .get('/reports/attendance-summary/export?month=1&year=2023&format=xlsx')
            .expect(200)
            .expect('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Test CSV format
        await request(app.getHttpServer())
            .get('/reports/attendance-summary/export?month=1&year=2023&format=csv')
            .expect(200)
            .expect('Content-Type', /text\/csv/);
    });

    it('/reports/leave-utilization/export (GET)', async () => {
        const workbook = new ExcelJS.Workbook();
        workbook.addWorksheet('Utilization');
        mockService.exportLeaveUtilization.mockResolvedValue(workbook);

        await request(app.getHttpServer())
            .get('/reports/leave-utilization/export?format=xlsx')
            .expect(200)
            .expect('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    attendance: {
        groupBy: jest.fn(),
    },
    leaveBalance: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
};

describe('ReportsService', () => {
    let service: ReportsService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get attendance summary', async () => {
        (prisma.attendance.groupBy as jest.Mock).mockResolvedValue([{ status: 'PRESENT', _count: { id: 5 } }]);
        const result = await service.getAttendanceSummaryData(1, 2023);
        expect(result).toHaveLength(1);
        expect(result[0].count).toBe(5);
    });

    it('should get leave utilization', async () => {
        (prisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
        const result = await service.getLeaveUtilizationData();
        expect(result).toBeDefined();
    });
});

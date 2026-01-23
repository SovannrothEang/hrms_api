import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaClient = {
    attendance: {
        groupBy: jest.fn(),
    },
    leaveBalance: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('ReportsService', () => {
    let service: ReportsService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get attendance summary', async () => {
        (prismaClient.attendance.groupBy as jest.Mock).mockResolvedValue([
            { status: 'PRESENT', _count: { id: 5 } },
        ]);
        const result = await service.getAttendanceSummaryData(1, 2023);
        expect(result).toHaveLength(1);
        expect(result[0].count).toBe(5);
    });

    it('should get leave utilization', async () => {
        (prismaClient.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
        const result = await service.getLeaveUtilizationData();
        expect(result).toBeDefined();
    });
});

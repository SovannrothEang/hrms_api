import { Test, TestingModule } from '@nestjs/testing';
import { LeavesService } from '../../../src/modules/leaves/leaves.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { EmailService } from '../../../src/modules/notifications/email.service';
import { LeaveStatus } from '../../../src/common/enums/leave-status.enum';

const mockPrismaService = {
    leaveBalance: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    leaveRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockEmailService = {
    sendLeaveRequestNotification: jest.fn(),
    sendLeaveStatusUpdateNotification: jest.fn(),
};

describe('LeavesService', () => {
    let service: LeavesService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeavesService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        service = module.get<LeavesService>(LeavesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create leave request', async () => {
            // Use future dates to pass validation
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            const dto = {
                employeeId: 'emp-1',
                leaveType: 'ANNUAL',
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: dayAfter.toISOString().split('T')[0],
                reason: 'Vacation'
            };

            const created = { id: '1', ...dto, startDate: tomorrow, endDate: dayAfter, status: LeaveStatus.PENDING };
            const balance = { id: 'b-1', totalDays: 10, usedDays: 0, pendingDays: 0 };

            // Mock no overlap
            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);

            // Mock transaction flow
            (prisma.leaveBalance.findUnique as jest.Mock).mockResolvedValue(balance);
            (prisma.leaveRequest.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto as any, 'admin-id');
            if (!result.isSuccess) console.error(result.error);
            expect(result.isSuccess).toBe(true);
            expect(prisma.leaveBalance.update).toHaveBeenCalled(); // Should increment pending
        });

        it('should create leave request with auto check balance (no balance record)', async () => {
            // Use future dates to pass validation
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            const dto = {
                employeeId: 'emp-1',
                leaveType: 'ANNUAL',
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: dayAfter.toISOString().split('T')[0],
                reason: 'Vacation'
            };

            // Mock no overlap
            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);
            // Mock no balance
            (prisma.leaveBalance.findUnique as jest.Mock).mockResolvedValue(null);
            // Mock create request return
            const created = { id: '1', ...dto, startDate: tomorrow, endDate: dayAfter, status: LeaveStatus.PENDING };
            (prisma.leaveRequest.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto as any, 'admin-id');
            expect(result.isSuccess).toBe(true);
            expect(prisma.leaveBalance.create).toHaveBeenCalled();
        });
    });
});

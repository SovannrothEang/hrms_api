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

        it('should fail when end date is before start date', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 1);

            const dto = {
                employeeId: 'emp-1',
                leaveType: 'ANNUAL',
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: dayAfter.toISOString().split('T')[0],
                reason: 'Vacation'
            };

            const result = await service.createAsync(dto as any, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('End date must be on or after start date');
        });

        it('should fail when start date is in the past', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dto = {
                employeeId: 'emp-1',
                leaveType: 'ANNUAL',
                startDate: yesterday.toISOString().split('T')[0],
                endDate: tomorrow.toISOString().split('T')[0],
                reason: 'Vacation'
            };

            const result = await service.createAsync(dto as any, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('Start date cannot be in the past');
        });

        it('should fail when overlapping request exists', async () => {
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

            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

            const result = await service.createAsync(dto as any, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('overlaps');
        });

        it('should fail when insufficient balance', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 8);

            const dto = {
                employeeId: 'emp-1',
                leaveType: 'ANNUAL',
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: nextWeek.toISOString().split('T')[0],
                reason: 'Vacation'
            };

            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.leaveBalance.findUnique as jest.Mock).mockResolvedValue({
                id: 'b-1', totalDays: 5, usedDays: 3, pendingDays: 1
            });

            const result = await service.createAsync(dto as any, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('Insufficient leave balance');
        });
    });

    describe('findAllAsync', () => {
        it('should return list of leaves', async () => {
            const leaves = [{ id: '1' }, { id: '2' }];
            (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(leaves);
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });
    });

    describe('findOneByIdAsync', () => {
        it('should return leave when found', async () => {
            const leave = { id: '1', status: LeaveStatus.PENDING };
            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(leave);
            const result = await service.findOneByIdAsync('1');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail when not found', async () => {
            (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);
            const result = await service.findOneByIdAsync('non-existent');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Leave request not found');
        });
    });

    describe('updateStatusAsync', () => {
        const mockLeave = {
            id: '1',
            employeeId: 'emp-1',
            leaveType: 'ANNUAL',
            startDate: new Date(),
            endDate: new Date(),
            status: LeaveStatus.PENDING
        };

        it('should approve pending leave', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(mockLeave);
            (prisma.leaveBalance.updateMany as jest.Mock).mockResolvedValue({});
            (prisma.leaveRequest.update as jest.Mock).mockResolvedValue({
                ...mockLeave, status: LeaveStatus.APPROVED
            });

            const result = await service.updateStatusAsync('1', {
                status: LeaveStatus.APPROVED, approverId: 'admin'
            }, 'admin');
            expect(result.isSuccess).toBe(true);
            expect(prisma.leaveBalance.updateMany).toHaveBeenCalled();
        });

        it('should reject pending leave', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(mockLeave);
            (prisma.leaveBalance.updateMany as jest.Mock).mockResolvedValue({});
            (prisma.leaveRequest.update as jest.Mock).mockResolvedValue({
                ...mockLeave, status: LeaveStatus.REJECTED
            });

            const result = await service.updateStatusAsync('1', {
                status: LeaveStatus.REJECTED, approverId: 'admin'
            }, 'admin');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail on non-pending leave', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue({
                ...mockLeave, status: LeaveStatus.APPROVED
            });

            const result = await service.updateStatusAsync('1', {
                status: LeaveStatus.REJECTED, approverId: 'admin'
            }, 'admin');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('Only PENDING');
        });

        it('should fail when not found', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await service.updateStatusAsync('non-existent', {
                status: LeaveStatus.APPROVED, approverId: 'admin'
            }, 'admin');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Leave request not found');
        });
    });

    describe('deleteAsync', () => {
        const mockLeave = {
            id: '1',
            employeeId: 'emp-1',
            leaveType: 'ANNUAL',
            startDate: new Date(),
            endDate: new Date(),
            status: LeaveStatus.PENDING
        };

        it('should delete pending leave', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(mockLeave);
            (prisma.leaveBalance.updateMany as jest.Mock).mockResolvedValue({});
            (prisma.leaveRequest.delete as jest.Mock).mockResolvedValue({});

            const result = await service.deleteAsync('1');
            expect(result.isSuccess).toBe(true);
            expect(prisma.leaveRequest.delete).toHaveBeenCalled();
        });

        it('should fail when not found', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await service.deleteAsync('non-existent');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Leave request not found');
        });

        it('should fail when leave is not pending', async () => {
            (prisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue({
                ...mockLeave, status: LeaveStatus.APPROVED
            });
            const result = await service.deleteAsync('1');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('Cannot delete');
        });
    });
});

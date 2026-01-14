import { Test, TestingModule } from '@nestjs/testing';
import { AttendancesService } from '../../../src/modules/attendances/attendances.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { AttendanceStatus } from '../../../src/common/enums/attendance-status.enum';

const mockPrismaService = {
    attendance: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    employee: {
        findFirst: jest.fn(),
    },
};

describe('AttendancesService', () => {
    let service: AttendancesService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendancesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AttendancesService>(AttendancesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkIn', () => {
        it('should check in successfully', async () => {
            const dto = { employeeId: 'emp-1' };
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Mock no existing attendance for today
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);

            // Mock employee with shift (Shift starting in future to ensure PRESENT)
            // Or easier: no shift -> default 9 AM. If test runs before 9 AM, it's present.
            // If it runs after 9 AM, it's Late. Tests should be deterministic.
            // Let's mock a shift that starts at 23:00 (11 PM) so it's always PRESENT if run before then.
            const shift = { startTime: new Date('1970-01-01T23:00:00Z'), gracePeriodMins: 0 };
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 'emp-1', shift });

            const created = { id: '1', status: AttendanceStatus.PRESENT, date: today };
            (prisma.attendance.create as jest.Mock).mockResolvedValue(created);

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if already checked in', async () => {
            const dto = { employeeId: 'emp-1' };
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('already checked in');
        });
    });

    describe('checkOut', () => {
        it('should check out successfully', async () => {
            const dto = { employeeId: 'emp-1' };
            // Mock existing attendance without checkout
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({ id: '1', checkOutTime: null });

            (prisma.attendance.update as jest.Mock).mockResolvedValue({ id: '1', checkOutTime: new Date() });

            const result = await service.checkOut(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if no check in record', async () => {
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
            const result = await service.checkOut({ employeeId: 'emp-1' }, 'admin-id');
            expect(result.isSuccess).toBe(false);
        });

        it('should fail if already checked out', async () => {
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({
                id: '1', checkOutTime: new Date()
            });
            const result = await service.checkOut({ employeeId: 'emp-1' }, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('already checked out');
        });
    });

    describe('findAllAsync', () => {
        it('should return list of attendances', async () => {
            const attendances = [{ id: '1' }, { id: '2' }];
            (prisma.attendance.findMany as jest.Mock).mockResolvedValue(attendances);
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });
    });

    describe('findOneByIdAsync', () => {
        it('should return attendance when found', async () => {
            const attendance = { id: '1', status: AttendanceStatus.PRESENT };
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(attendance);
            const result = await service.findOneByIdAsync('1');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail when not found', async () => {
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
            const result = await service.findOneByIdAsync('non-existent');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Attendance not found');
        });
    });

    describe('checkIn - LATE status', () => {
        it('should mark as LATE when past shift start time', async () => {
            const dto = { employeeId: 'emp-1' };
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);

            // Shift that started hours ago (e.g., 01:00 AM UTC)
            const shift = { startTime: new Date('1970-01-01T01:00:00Z'), gracePeriodMins: 0 };
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 'emp-1', shift });

            const created = { id: '1', status: AttendanceStatus.LATE };
            (prisma.attendance.create as jest.Mock).mockResolvedValue(created);

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
            expect(prisma.attendance.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: AttendanceStatus.LATE })
                })
            );
        });

        it('should fail when employee not found', async () => {
            const dto = { employeeId: 'non-existent' };
            (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Employee not found');
        });
    });
});

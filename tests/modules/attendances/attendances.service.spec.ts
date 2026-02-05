import { Test, TestingModule } from '@nestjs/testing';
import { AttendancesService } from '../../../src/modules/attendances/attendances.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { AttendanceStatus } from '../../../src/common/enums/attendance-status.enum';

const mockPrismaClient = {
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

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('AttendancesService', () => {
    let service: AttendancesService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendancesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AttendancesService>(AttendancesService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkIn', () => {
        it('should check in successfully', async () => {
            const dto = { employeeId: 'emp-1', qrToken: 'mock-token' };
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Mock no existing attendance for today
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );

            // Mock employee with shift (Shift starting in future to ensure PRESENT)
            // Or easier: no shift -> default 9 AM. If test runs before 9 AM, it's present.
            // If it runs after 9 AM, it's Late. Tests should be deterministic.
            // Let's mock a shift that starts at 23:00 (11 PM) so it's always PRESENT if run before then.
            const shift = {
                startTime: new Date('1970-01-01T23:00:00Z'),
                gracePeriodMins: 0,
            };
            (prismaClient.employee.findFirst as jest.Mock).mockResolvedValue({
                id: 'emp-1',
                shift,
            });

            const created = {
                id: '1',
                status: AttendanceStatus.PRESENT,
                date: today,
            };
            (prismaClient.attendance.create as jest.Mock).mockResolvedValue(
                created,
            );

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if already checked in', async () => {
            const dto = { employeeId: 'emp-1', qrToken: 'mock-token' };
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
            });

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('already checked in');
        });
    });

    describe('checkOut', () => {
        it('should check out successfully', async () => {
            const dto = { employeeId: 'emp-1', qrToken: 'mock-token' };
            // Mock existing attendance without checkout
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
                checkOutTime: null,
            });

            (prismaClient.attendance.update as jest.Mock).mockResolvedValue({
                id: '1',
                checkOutTime: new Date(),
            });

            const result = await service.checkOut(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if no check in record', async () => {
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );
            const result = await service.checkOut(
                { employeeId: 'emp-1', qrToken: 'mock-token' },
                'admin-id',
            );
            expect(result.isSuccess).toBe(false);
        });

        it('should fail if already checked out', async () => {
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
                checkOutTime: new Date(),
            });
            const result = await service.checkOut(
                { employeeId: 'emp-1', qrToken: 'mock-token' },
                'admin-id',
            );
            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('already checked out');
        });
    });

    describe('findAllAsync', () => {
        it('should return list of attendances', async () => {
            const attendances = [{ id: '1' }, { id: '2' }];
            (prismaClient.attendance.findMany as jest.Mock).mockResolvedValue(
                attendances,
            );
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });
    });

    describe('findOneByIdAsync', () => {
        it('should return attendance when found', async () => {
            const attendance = { id: '1', status: AttendanceStatus.PRESENT };
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                attendance,
            );
            const result = await service.findOneByIdAsync('1');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail when not found', async () => {
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );
            const result = await service.findOneByIdAsync('non-existent');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Attendance not found');
        });
    });

    describe('checkIn - LATE status', () => {
        it('should mark as LATE when past shift start time', async () => {
            const dto = { employeeId: 'emp-1', qrToken: 'mock-token' };
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );

            // Shift that started hours ago (e.g., 01:00 AM UTC)
            const shift = {
                startTime: new Date('1970-01-01T01:00:00Z'),
                gracePeriodMins: 0,
            };
            (prismaClient.employee.findFirst as jest.Mock).mockResolvedValue({
                id: 'emp-1',
                shift,
            });

            const created = { id: '1', status: AttendanceStatus.LATE };
            (prismaClient.attendance.create as jest.Mock).mockResolvedValue(
                created,
            );

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
            expect(prismaClient.attendance.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: AttendanceStatus.LATE,
                    }),
                }),
            );
        });

        it('should fail when employee not found', async () => {
            const dto = { employeeId: 'non-existent', qrToken: 'mock-token' };
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );
            (prismaClient.employee.findFirst as jest.Mock).mockResolvedValue(
                null,
            );

            const result = await service.checkIn(dto, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Employee not found');
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsService } from '../../../src/modules/shifts/shifts.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { CreateShiftDto } from '../../../src/modules/shifts/dtos/create-shift.dto';

const mockPrismaService = {
    shift: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
};

describe('ShiftsService', () => {
    let service: ShiftsService;
    let prisma: typeof mockPrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShiftsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<ShiftsService>(ShiftsService);
        prisma = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAsync', () => {
        it('should create a shift successfully', async () => {
            const dto: CreateShiftDto = {
                name: 'Morning Shift',
                startTime: '09:00',
                endTime: '18:00',
                workDays: '1,2,3,4,5',
                gracePeriodMins: 15,
            };

            const mockShift = {
                id: 'shift-id-1',
                ...dto,
                startTime: new Date('1970-01-01T09:00:00Z'),
                endTime: new Date('1970-01-01T18:00:00Z'),
                performBy: 'admin',
                isDeleted: false,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };

            prisma.shift.create.mockResolvedValue(mockShift);

            const result = await service.createAsync(dto, 'admin');

            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe(dto.name);
            expect(prisma.shift.create).toHaveBeenCalled();
        });
    });

    describe('findAllAsync', () => {
        it('should return array of shifts', async () => {
            const mockShifts = [
                { id: '1', name: 'Shift 1', isDeleted: false },
                { id: '2', name: 'Shift 2', isDeleted: false },
            ];
            prisma.shift.findMany.mockResolvedValue(mockShifts);

            const result = await service.findAllAsync();

            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });
    });

    describe('findOneByIdAsync', () => {
        it('should return a shift if found', async () => {
            const mockShift = { id: '1', name: 'Shift 1', isDeleted: false };
            prisma.shift.findUnique.mockResolvedValue(mockShift);

            const result = await service.findOneByIdAsync('1');

            expect(result.isSuccess).toBe(true);
            expect(result.getData().id).toBe('1');
        });

        it('should fail if not found', async () => {
            prisma.shift.findUnique.mockResolvedValue(null);

            const result = await service.findOneByIdAsync('999');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Shift not found');
        });
    });
});

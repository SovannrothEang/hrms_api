import { Test, TestingModule } from '@nestjs/testing';
import { PublicHolidaysService } from '../../../src/modules/public-holidays/public-holidays.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { CreatePublicHolidayDto } from '../../../src/modules/public-holidays/dtos/create-public-holiday.dto';

const mockPrismaClient = {
    publicHoliday: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('PublicHolidaysService', () => {
    let service: PublicHolidaysService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicHolidaysService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PublicHolidaysService>(PublicHolidaysService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAsync', () => {
        it('should create holiday successfully', async () => {
            const dto: CreatePublicHolidayDto = {
                name: 'New Year',
                date: new Date('2026-01-01'),
                isRecurring: true,
            };

            const mockHoliday = {
                id: 'holiday-1',
                ...dto,
                performBy: 'admin',
                isDeleted: false,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };

            prismaClient.publicHoliday.create.mockResolvedValue(mockHoliday);

            const result = await service.createAsync(dto, 'admin');

            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe(dto.name);
        });
    });

    describe('findAllAsync', () => {
        it('should return all holidays', async () => {
            const mockHolidays = [
                { id: '1', name: 'H1' },
                { id: '2', name: 'H2' },
            ];
            prismaClient.publicHoliday.findMany.mockResolvedValue(mockHolidays);

            const result = await service.findAllAsync();

            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });
    });

    describe('deleteAsync', () => {
        it('should delete existing holiday', async () => {
            const mockHoliday = { id: '1', isDeleted: false };
            prismaClient.publicHoliday.findUnique.mockResolvedValue(
                mockHoliday,
            );
            prismaClient.publicHoliday.update.mockResolvedValue({
                ...mockHoliday,
                isDeleted: true,
            });

            const result = await service.deleteAsync('1', 'admin');

            expect(result.isSuccess).toBe(true);
            expect(prismaClient.publicHoliday.update).toHaveBeenCalled();
        });
    });
});

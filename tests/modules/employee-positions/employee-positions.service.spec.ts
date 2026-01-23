import { Test, TestingModule } from '@nestjs/testing';
import { EmployeePositionsService } from '../../../src/modules/employee-positions/employee-positions.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaClient = {
    employeePosition: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('EmployeePositionsService', () => {
    let service: EmployeePositionsService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmployeePositionsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EmployeePositionsService>(
            EmployeePositionsService,
        );
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createEmployeePosition', () => {
        it('should create position', async () => {
            const dto = {
                title: 'Developer',
                salaryRangeMin: 1000,
                salaryRangeMax: 2000,
            };
            const created = {
                id: '1',
                ...dto,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (
                prismaClient.employeePosition.findFirst as jest.Mock
            ).mockResolvedValue(null);
            (
                prismaClient.employeePosition.create as jest.Mock
            ).mockResolvedValue(created);

            const result = await service.createEmployeePosition(
                dto as any,
                'user-id',
            );
            expect(result.isSuccess).toBe(true);
            expect(result.getData().title).toBe('Developer');
        });

        it('should fail if title exists', async () => {
            const dto = { title: 'Developer' };
            (
                prismaClient.employeePosition.findFirst as jest.Mock
            ).mockResolvedValue({ id: '1' });

            const result = await service.createEmployeePosition(
                dto as any,
                'user-id',
            );
            expect(result.isSuccess).toBe(false);
        });
    });

    describe('findAllAsync', () => {
        it('should return positions', async () => {
            const list = [{ id: '1', title: 'Developer' }];
            (
                prismaClient.employeePosition.findMany as jest.Mock
            ).mockResolvedValue(list);

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });
});

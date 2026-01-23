import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from '../../../src/modules/departments/departments.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaClient = {
    department: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('DepartmentsService', () => {
    let service: DepartmentsService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DepartmentsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<DepartmentsService>(DepartmentsService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create department', async () => {
            const dto = { name: 'Engineering' };
            const created = {
                id: '1',
                departmentName: 'Engineering',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prismaClient.department.findFirst as jest.Mock).mockResolvedValue(
                null,
            );
            (prismaClient.department.create as jest.Mock).mockResolvedValue(
                created,
            );

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe('Engineering');
        });

        it('should fail if name exists', async () => {
            const dto = { name: 'Engineering' };
            (prismaClient.department.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
            });

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe("Department's name already exists");
        });
    });

    describe('findAllAsync', () => {
        it('should return departments', async () => {
            const list = [{ id: '1', departmentName: 'Engineering' }];
            (prismaClient.department.findMany as jest.Mock).mockResolvedValue(
                list,
            );

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });
});

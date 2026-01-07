import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from '../../../src/modules/departments/departments.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    department: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

describe('DepartmentsService', () => {
    let service: DepartmentsService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DepartmentsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<DepartmentsService>(DepartmentsService);
        prisma = module.get<PrismaService>(PrismaService);
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
            const created = { id: '1', departmentName: 'Engineering', isActive: true, createdAt: new Date(), updatedAt: new Date() };

            (prisma.department.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.department.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe('Engineering');
        });

        it('should fail if name exists', async () => {
            const dto = { name: 'Engineering' };
            (prisma.department.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe("Department's name already exists");
        });
    });

    describe('findAllAsync', () => {
        it('should return departments', async () => {
            const list = [{ id: '1', departmentName: 'Engineering' }];
            (prisma.department.findMany as jest.Mock).mockResolvedValue(list);

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });
});

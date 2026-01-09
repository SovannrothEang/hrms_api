import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from '../../../src/modules/employees/employees.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    employee: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    user: {
        findFirst: jest.fn(),
        create: jest.fn(),
    },
    role: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

describe('EmployeesService', () => {
    let service: EmployeesService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmployeesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EmployeesService>(EmployeesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAllAsync', () => {
        it('should return employees', async () => {
            const list = [{
                id: '1',
                firstname: 'John',
                dob: new Date('1990-01-01'),
                hireDate: new Date('2020-01-01')
            }];
            (prisma.employee.findMany as jest.Mock).mockResolvedValue(list);

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });

    describe('createAsync', () => {
        it('should create employee', async () => {
            const dto = {
                username: 'john', email: 'john@example.com', password: 'pass',
                employeeCode: 'EMP001', firstname: 'John', lastname: 'Doe',
                gender: 1, dob: '1990-01-01', hireDate: '2020-01-01',
                departmentId: 'dep-1', positionId: 'pos-1', roleName: 'employee'
            };

            const createdEmployee = {
                id: '1',
                ...dto,
                dob: new Date('1990-01-01'),
                hireDate: new Date('2020-01-01')
            };
            const createdUser = { id: 'user-1' };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
            (prisma.employee.create as jest.Mock).mockResolvedValue(createdEmployee);
            (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: 'role-1' });

            const result = await service.createAsync(dto as any, 'admin-id');
            if (!result.isSuccess) console.error(result.error);
            expect(result.isSuccess).toBe(true);
        });
    });
});

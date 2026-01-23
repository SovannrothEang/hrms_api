import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from '../../../src/modules/employees/employees.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaClient = {
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
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('EmployeesService', () => {
    let service: EmployeesService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmployeesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EmployeesService>(EmployeesService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAllAsync', () => {
        it('should return employees', async () => {
            const list = [
                {
                    id: '1',
                    firstname: 'John',
                    dob: new Date('1990-01-01'),
                    hireDate: new Date('2020-01-01'),
                },
            ];
            (prismaClient.employee.findMany as jest.Mock).mockResolvedValue(
                list,
            );

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });

    describe('createAsync', () => {
        it('should create employee', async () => {
            const dto = {
                username: 'john',
                email: 'john@example.com',
                password: 'pass',
                employeeCode: 'EMP001',
                firstname: 'John',
                lastname: 'Doe',
                gender: 1,
                dob: '1990-01-01',
                hireDate: '2020-01-01',
                departmentId: 'dep-1',
                positionId: 'pos-1',
                roleName: 'employee',
            };

            const createdEmployee = {
                id: '1',
                ...dto,
                dob: new Date('1990-01-01'),
                hireDate: new Date('2020-01-01'),
            };
            const createdUser = { id: 'user-1' };

            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaClient.employee.findUnique as jest.Mock).mockResolvedValue(
                null,
            );
            (prismaClient.user.create as jest.Mock).mockResolvedValue(
                createdUser,
            );
            (prismaClient.employee.create as jest.Mock).mockResolvedValue(
                createdEmployee,
            );
            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue({
                id: 'role-1',
            });

            const result = await service.createAsync(dto as any, 'admin-id');
            if (!result.isSuccess) console.error(result.error);
            expect(result.isSuccess).toBe(true);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PayrollsService, PayrollStatus, PayrollItemType } from '../../../../src/modules/payroll/payrolls/payrolls.service';
import { PrismaService } from '../../../../src/common/services/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';

const mockPrismaService = {
    employee: {
        findUnique: jest.fn(),
    },
    currency: {
        findUnique: jest.fn(),
    },
    taxBracket: {
        findFirst: jest.fn(),
    },
    payroll: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    payrollItems: {
        createMany: jest.fn(),
    },
    taxCalculation: {
        create: jest.fn(),
    },
    $transaction: jest.fn(),
};

describe('PayrollsService', () => {
    let service: PayrollsService;
    let prisma: typeof mockPrismaService;

    const mockEmployee = {
        id: 'emp-1',
        isDeleted: false,
        position: {
            salaryRangeMin: new Decimal(2500),
            salaryRangeMax: new Decimal(5000),
        },
        taxConfig: {
            taxExempt: false,
            taxCountry: 'KH',
        },
    };

    const mockCurrency = {
        code: 'USD',
        name: 'US Dollar',
        isDeleted: false,
    };

    const mockTaxBracket = {
        id: 'bracket-1',
        taxRate: new Decimal(0.05),
        fixedAmount: new Decimal(0),
        minAmount: new Decimal(0),
        maxAmount: new Decimal(10000),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayrollsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PayrollsService>(PayrollsService);
        prisma = mockPrismaService;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createDraftAsync', () => {
        const validDto = {
            employeeId: 'emp-1',
            payPeriodStart: '2026-01-01',
            payPeriodEnd: '2026-01-31',
            currencyCode: 'USD',
            overtimeHours: 10,
            bonus: 500,
            deductions: 100,
        };

        it('should create draft payroll with correct calculations', async () => {
            const createdPayroll = {
                id: 'payroll-1',
                ...validDto,
                status: PayrollStatus.PENDING,
            };

            prisma.employee.findUnique.mockResolvedValue(mockEmployee);
            prisma.currency.findUnique.mockResolvedValue(mockCurrency);
            prisma.taxBracket.findFirst.mockResolvedValue(mockTaxBracket);
            prisma.$transaction.mockImplementation(async (callback) => {
                return callback({
                    payroll: { create: jest.fn().mockResolvedValue(createdPayroll) },
                    payrollItems: { createMany: jest.fn() },
                    taxCalculation: { create: jest.fn() },
                });
            });
            prisma.payroll.findUnique.mockResolvedValue({
                ...createdPayroll,
                items: [],
                taxCalculation: null,
            });

            const result = await service.createDraftAsync(validDto, 'user-1');

            expect(result.isSuccess).toBe(true);
            expect(prisma.employee.findUnique).toHaveBeenCalledWith({
                where: { id: 'emp-1', isDeleted: false },
                include: { position: true, taxConfig: true },
            });
        });

        it('should fail if employee not found', async () => {
            prisma.employee.findUnique.mockResolvedValue(null);

            const result = await service.createDraftAsync(validDto, 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Employee not found');
        });

        it('should fail if currency is invalid', async () => {
            prisma.employee.findUnique.mockResolvedValue(mockEmployee);
            prisma.currency.findUnique.mockResolvedValue(null);

            const result = await service.createDraftAsync(validDto, 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Invalid currency code');
        });

        it('should fail if pay period end is before start', async () => {
            const invalidDto = {
                ...validDto,
                payPeriodStart: '2026-01-31',
                payPeriodEnd: '2026-01-01',
            };

            const result = await service.createDraftAsync(invalidDto, 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Pay period end must be after start date');
        });

        it('should set tax to 0 for tax exempt employee', async () => {
            const exemptEmployee = {
                ...mockEmployee,
                taxConfig: { taxExempt: true, taxCountry: 'KH' },
            };

            prisma.employee.findUnique.mockResolvedValue(exemptEmployee);
            prisma.currency.findUnique.mockResolvedValue(mockCurrency);

            const createdPayroll = { id: 'payroll-1', status: PayrollStatus.PENDING };
            prisma.$transaction.mockImplementation(async (callback) => {
                return callback({
                    payroll: { create: jest.fn().mockResolvedValue(createdPayroll) },
                    payrollItems: { createMany: jest.fn() },
                    taxCalculation: { create: jest.fn() },
                });
            });
            prisma.payroll.findUnique.mockResolvedValue({
                ...createdPayroll,
                items: [],
                taxCalculation: null,
            });

            const result = await service.createDraftAsync(validDto, 'user-1');

            expect(result.isSuccess).toBe(true);
            // Tax calculation should not be called for exempt employees
            expect(prisma.taxBracket.findFirst).not.toHaveBeenCalled();
        });

        it('should use basicSalaryOverride when provided', async () => {
            const dtoWithOverride = {
                ...validDto,
                basicSalaryOverride: 3000,
            };

            prisma.employee.findUnique.mockResolvedValue(mockEmployee);
            prisma.currency.findUnique.mockResolvedValue(mockCurrency);
            prisma.taxBracket.findFirst.mockResolvedValue(mockTaxBracket);

            const createdPayroll = { id: 'payroll-1', status: PayrollStatus.PENDING };
            prisma.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    payroll: { create: jest.fn().mockResolvedValue(createdPayroll) },
                    payrollItems: { createMany: jest.fn() },
                    taxCalculation: { create: jest.fn() },
                };
                return callback(tx);
            });
            prisma.payroll.findUnique.mockResolvedValue({
                ...createdPayroll,
                items: [],
                taxCalculation: null,
            });

            const result = await service.createDraftAsync(dtoWithOverride, 'user-1');

            expect(result.isSuccess).toBe(true);
        });
    });

    describe('finalizeAsync', () => {
        it('should finalize pending payroll', async () => {
            const pendingPayroll = {
                id: 'payroll-1',
                status: PayrollStatus.PENDING,
                isDeleted: false,
            };

            prisma.payroll.findUnique.mockResolvedValueOnce(pendingPayroll);
            prisma.payroll.update.mockResolvedValue({
                ...pendingPayroll,
                status: PayrollStatus.PROCESSED,
            });
            prisma.payroll.findUnique.mockResolvedValueOnce({
                ...pendingPayroll,
                status: PayrollStatus.PROCESSED,
                items: [],
                taxCalculation: null,
            });

            const result = await service.finalizeAsync('payroll-1', 'user-1');

            expect(result.isSuccess).toBe(true);
            expect(prisma.payroll.update).toHaveBeenCalledWith({
                where: { id: 'payroll-1' },
                data: expect.objectContaining({
                    status: PayrollStatus.PROCESSED,
                }),
            });
        });

        it('should fail if payroll not found', async () => {
            prisma.payroll.findUnique.mockResolvedValue(null);

            const result = await service.finalizeAsync('non-existent', 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Payroll not found');
        });

        it('should fail if payroll is not pending', async () => {
            prisma.payroll.findUnique.mockResolvedValue({
                id: 'payroll-1',
                status: PayrollStatus.PROCESSED,
                isDeleted: false,
            });

            const result = await service.finalizeAsync('payroll-1', 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toContain('Cannot finalize');
        });
    });

    describe('findByIdAsync', () => {
        beforeEach(() => {
            // Reset findUnique mock for this test block
            mockPrismaService.payroll.findUnique.mockReset();
        });

        it('should return payroll with items and tax', async () => {
            const payroll = {
                id: 'payroll-1',
                employeeId: 'emp-1',
                currencyCode: 'USD',
                status: PayrollStatus.PENDING,
                isDeleted: false,
                payPeriodStart: new Date('2026-01-01'),
                payPeriodEnd: new Date('2026-01-31'),
                basicSalary: new Decimal(2500),
                overtimeHrs: new Decimal(10),
                overtimeRate: new Decimal(23.44),
                bonus: new Decimal(500),
                deductions: new Decimal(100),
                netSalary: new Decimal(2850),
                createdAt: new Date(),
                updatedAt: new Date(),
                items: [{
                    id: 'item-1',
                    itemType: PayrollItemType.EARNING,
                    itemName: 'Basic Salary',
                    amount: new Decimal(2500),
                    isDeleted: false
                }],
                taxCalculation: { id: 'tax-1', taxAmount: new Decimal(150) },
            };

            mockPrismaService.payroll.findUnique.mockResolvedValue(payroll);

            const result = await service.findByIdAsync('payroll-1');

            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toBeDefined();
            expect(mockPrismaService.payroll.findUnique).toHaveBeenCalled();
        });

        it('should fail if payroll not found', async () => {
            mockPrismaService.payroll.findUnique.mockResolvedValue(null);

            const result = await service.findByIdAsync('non-existent');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Payroll not found');
        });

        it('should handle database errors', async () => {
            mockPrismaService.payroll.findUnique.mockRejectedValue(new Error('DB connection failed'));

            const result = await service.findByIdAsync('payroll-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to fetch payroll');
        });
    });

    describe('findAllAsync', () => {
        it('should return all payrolls', async () => {
            const payrolls = [
                { id: 'payroll-1', items: [], taxCalculation: null },
                { id: 'payroll-2', items: [], taxCalculation: null },
            ];

            prisma.payroll.findMany.mockResolvedValue(payrolls);

            const result = await service.findAllAsync();

            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(2);
        });

        it('should filter by employeeId', async () => {
            prisma.payroll.findMany.mockResolvedValue([]);

            await service.findAllAsync({ employeeId: 'emp-1' });

            expect(prisma.payroll.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ employeeId: 'emp-1' }),
                }),
            );
        });

        it('should filter by status', async () => {
            prisma.payroll.findMany.mockResolvedValue([]);

            await service.findAllAsync({ status: PayrollStatus.PENDING });

            expect(prisma.payroll.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: PayrollStatus.PENDING }),
                }),
            );
        });
    });

    describe('deleteAsync', () => {
        it('should soft-delete pending payroll', async () => {
            prisma.payroll.findUnique.mockResolvedValue({
                id: 'payroll-1',
                status: PayrollStatus.PENDING,
                isDeleted: false,
            });
            prisma.payroll.update.mockResolvedValue({});

            const result = await service.deleteAsync('payroll-1', 'user-1');

            expect(result.isSuccess).toBe(true);
            expect(prisma.payroll.update).toHaveBeenCalledWith({
                where: { id: 'payroll-1' },
                data: expect.objectContaining({ isDeleted: true }),
            });
        });

        it('should fail if payroll not found', async () => {
            prisma.payroll.findUnique.mockResolvedValue(null);

            const result = await service.deleteAsync('non-existent', 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Payroll not found');
        });

        it('should fail if payroll is not pending', async () => {
            prisma.payroll.findUnique.mockResolvedValue({
                id: 'payroll-1',
                status: PayrollStatus.PROCESSED,
                isDeleted: false,
            });

            const result = await service.deleteAsync('payroll-1', 'user-1');

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Only PENDING payrolls can be deleted');
        });
    });
});

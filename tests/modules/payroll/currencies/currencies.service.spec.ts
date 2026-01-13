import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesService } from '../../../../src/modules/payroll/currencies/currencies.service';
import { PrismaService } from '../../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    currency: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
};

describe('CurrenciesService', () => {
    let service: CurrenciesService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrenciesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<CurrenciesService>(CurrenciesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create a currency successfully', async () => {
            const dto = { code: 'USD', name: 'US Dollar', symbol: '$', country: 'USA' };
            const created = { id: '1', ...dto, isDeleted: false, isActive: true };

            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.currency.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().code).toBe('USD');
        });

        it('should fail if currency code exists', async () => {
            const dto = { code: 'USD', name: 'US Dollar', symbol: '$', country: 'USA' };
            (prisma.currency.findUnique as jest.Mock).mockResolvedValue({ id: '1', ...dto, isDeleted: false });

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Currency code already exists');
        });

        it('should reactivate if currency code exists but is deleted', async () => {
            const dto = { code: 'USD', name: 'US Dollar', symbol: '$', country: 'USA' };
            const deleted = { id: '1', ...dto, isDeleted: true };
            const restored = { ...deleted, isDeleted: false, isActive: true };

            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(deleted);
            (prisma.currency.update as jest.Mock).mockResolvedValue(restored);

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().isActive).toBe(true);
        });
    });

    describe('findAllAsync', () => {
        it('should return all currencies', async () => {
            const list = [{ id: '1', code: 'USD' }];
            (prisma.currency.findMany as jest.Mock).mockResolvedValue(list);

            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });

        it('should handle Prisma error', async () => {
            (prisma.currency.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to fetch currencies');
        });
    });

    describe('findOneByIdAsync', () => {
        it('should return currency when found', async () => {
            const currency = { id: '1', code: 'USD', name: 'US Dollar', isDeleted: false };
            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(currency);
            const result = await service.findOneByIdAsync('1');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().code).toBe('USD');
        });

        it('should fail when currency not found', async () => {
            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await service.findOneByIdAsync('non-existent');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Currency not found');
        });

        it('should handle Prisma error', async () => {
            (prisma.currency.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
            const result = await service.findOneByIdAsync('1');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to fetch currency');
        });
    });

    describe('deleteAsync', () => {
        it('should soft-delete existing currency', async () => {
            (prisma.currency.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
            (prisma.currency.update as jest.Mock).mockResolvedValue({});
            const result = await service.deleteAsync('1', 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(prisma.currency.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: expect.objectContaining({ isDeleted: true, performBy: 'user-id' })
            });
        });

        it('should fail when currency not found', async () => {
            (prisma.currency.findFirst as jest.Mock).mockResolvedValue(null);
            const result = await service.deleteAsync('non-existent', 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Currency not found');
        });

        it('should handle Prisma error during delete', async () => {
            (prisma.currency.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
            (prisma.currency.update as jest.Mock).mockRejectedValue(new Error('DB error'));
            const result = await service.deleteAsync('1', 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to delete currency');
        });
    });

    describe('createAsync - error handling', () => {
        it('should handle Prisma error during creation', async () => {
            const dto = { code: 'USD', name: 'US Dollar', symbol: '$', country: 'USA' };
            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.currency.create as jest.Mock).mockRejectedValue(new Error('DB error'));
            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to create currency');
        });
    });
});

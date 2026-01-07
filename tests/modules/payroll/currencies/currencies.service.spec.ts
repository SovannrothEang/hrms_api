import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesService } from '../../../../src/modules/payroll/currencies/currencies.service';
import { PrismaService } from '../../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    currency: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
    });
});

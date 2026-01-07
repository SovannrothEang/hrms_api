import { Test, TestingModule } from '@nestjs/testing';
import { TaxBracketsService } from '../../../../src/modules/payroll/tax-brackets/tax-brackets.service';
import { PrismaService } from '../../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    currency: {
        findUnique: jest.fn(),
    },
    taxBracket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
};

describe('TaxBracketsService', () => {
    let service: TaxBracketsService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaxBracketsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<TaxBracketsService>(TaxBracketsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create tax bracket if currency exists', async () => {
            const dto = {
                currencyCode: 'USD', countryCode: 'US', taxYear: 2026,
                bracketName: 'Tier 1', minAmount: 0, maxAmount: 10000,
                taxRate: 0.1, fixedAmount: 0
            };
            const created = { id: '1', ...dto };

            (prisma.currency.findUnique as jest.Mock).mockResolvedValue({ id: 'curr-1' });
            (prisma.taxBracket.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if currency invalid', async () => {
            const dto = {
                currencyCode: 'XXX', countryCode: 'US', taxYear: 2026,
                bracketName: 'Tier 1', minAmount: 0, maxAmount: 10000,
                taxRate: 0.1, fixedAmount: 0
            };
            (prisma.currency.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Invalid Currency Code');
        });
    });

    describe('findAllAsync', () => {
        it('should return brackets filtered by country and year', async () => {
            (prisma.taxBracket.findMany as jest.Mock).mockResolvedValue([]);
            await service.findAllAsync('US', 2026);
            expect(prisma.taxBracket.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ countryCode: 'US', taxYear: 2026 })
            }));
        });
    });
});

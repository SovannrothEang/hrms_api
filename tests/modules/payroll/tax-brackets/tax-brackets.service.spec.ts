import { Test, TestingModule } from '@nestjs/testing';
import { TaxBracketsService } from '../../../../src/modules/payroll/tax-brackets/tax-brackets.service';
import { PrismaService } from '../../../../src/common/services/prisma/prisma.service';

const mockPrismaClient = {
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

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('TaxBracketsService', () => {
    let service: TaxBracketsService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaxBracketsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<TaxBracketsService>(TaxBracketsService);
        prismaClient = mockPrismaClient;
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
                currencyCode: 'USD',
                countryCode: 'US',
                taxYear: 2026,
                bracketName: 'Tier 1',
                minAmount: 0,
                maxAmount: 10000,
                taxRate: 0.1,
                fixedAmount: 0,
            };
            const created = { id: '1', ...dto };

            (prismaClient.currency.findUnique as jest.Mock).mockResolvedValue({
                id: 'curr-1',
            });
            (prismaClient.taxBracket.create as jest.Mock).mockResolvedValue(
                created,
            );

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(true);
        });

        it('should fail if currency invalid', async () => {
            const dto = {
                currencyCode: 'XXX',
                countryCode: 'US',
                taxYear: 2026,
                bracketName: 'Tier 1',
                minAmount: 0,
                maxAmount: 10000,
                taxRate: 0.1,
                fixedAmount: 0,
            };
            (prismaClient.currency.findUnique as jest.Mock).mockResolvedValue(
                null,
            );

            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Invalid Currency Code');
        });
    });

    describe('findAllAsync', () => {
        it('should return brackets filtered by country and year', async () => {
            (prismaClient.taxBracket.findMany as jest.Mock).mockResolvedValue(
                [],
            );
            await service.findAllAsync('US', 2026);
            expect(prismaClient.taxBracket.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        countryCode: 'US',
                        taxYear: 2026,
                    }),
                }),
            );
        });

        it('should filter by country only', async () => {
            (prismaClient.taxBracket.findMany as jest.Mock).mockResolvedValue(
                [],
            );
            await service.findAllAsync('US');
            expect(prismaClient.taxBracket.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        countryCode: 'US',
                        isDeleted: false,
                    }),
                }),
            );
        });

        it('should filter by year only', async () => {
            (prismaClient.taxBracket.findMany as jest.Mock).mockResolvedValue(
                [],
            );
            await service.findAllAsync(undefined, 2026);
            expect(prismaClient.taxBracket.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        taxYear: 2026,
                        isDeleted: false,
                    }),
                }),
            );
        });

        it('should return empty array when no brackets match', async () => {
            (prismaClient.taxBracket.findMany as jest.Mock).mockResolvedValue(
                [],
            );
            const result = await service.findAllAsync('ZZ', 1999);
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(0);
        });

        it('should handle Prisma error', async () => {
            (prismaClient.taxBracket.findMany as jest.Mock).mockRejectedValue(
                new Error('DB error'),
            );
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to fetch tax brackets');
        });
    });

    describe('deleteAsync', () => {
        it('should soft-delete existing bracket', async () => {
            (prismaClient.taxBracket.findUnique as jest.Mock).mockResolvedValue(
                {
                    id: '1',
                },
            );
            (prismaClient.taxBracket.update as jest.Mock).mockResolvedValue({});
            const result = await service.deleteAsync('1', 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(prismaClient.taxBracket.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { isDeleted: true, performBy: 'user-id' },
            });
        });

        it('should fail when bracket not found', async () => {
            (prismaClient.taxBracket.findUnique as jest.Mock).mockResolvedValue(
                null,
            );
            const result = await service.deleteAsync('non-existent', 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Tax bracket not found');
        });

        it('should handle Prisma error during delete', async () => {
            (prismaClient.taxBracket.findUnique as jest.Mock).mockResolvedValue(
                {
                    id: '1',
                },
            );
            (prismaClient.taxBracket.update as jest.Mock).mockRejectedValue(
                new Error('DB error'),
            );
            const result = await service.deleteAsync('1', 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to delete tax bracket');
        });
    });

    describe('createAsync - error handling', () => {
        it('should handle Prisma error during creation', async () => {
            const dto = {
                currencyCode: 'USD',
                countryCode: 'US',
                taxYear: 2026,
                bracketName: 'Tier 1',
                minAmount: 0,
                maxAmount: 10000,
                taxRate: 0.1,
                fixedAmount: 0,
            };
            (prismaClient.currency.findUnique as jest.Mock).mockResolvedValue({
                id: 'curr-1',
            });
            (prismaClient.taxBracket.create as jest.Mock).mockRejectedValue(
                new Error('DB error'),
            );
            const result = await service.createAsync(dto, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Failed to create tax bracket');
        });
    });
});

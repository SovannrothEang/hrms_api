import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTaxBracketDto } from './dtos/create-tax-bracket.dto';
import { TaxBracketDto } from './dtos/tax-bracket.dto';
import { Result } from '../../../common/logic/result';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TaxBracketsService {
    private readonly logger = new Logger(TaxBracketsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreateTaxBracketDto,
        userId: string,
    ): Promise<Result<TaxBracketDto>> {
        try {
            // Validate Currency Existence
            const currency = await this.prisma.currency.findUnique({
                where: { code: dto.currencyCode },
            });
            if (!currency) return Result.fail('Invalid Currency Code');

            const newValue = await this.prisma.taxBracket.create({
                data: {
                    ...dto,
                    performBy: userId,
                },
            });

            return Result.ok(plainToInstance(TaxBracketDto, newValue));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to create tax bracket');
        }
    }

    async findAllAsync(
        countryCode?: string,
        year?: number,
    ): Promise<Result<TaxBracketDto[]>> {
        try {
            const whereClause: Prisma.TaxBracketWhereInput = {
                isDeleted: false,
            };
            if (countryCode) whereClause.countryCode = countryCode;
            if (year) whereClause.taxYear = year;

            const values = await this.prisma.taxBracket.findMany({
                where: whereClause,
                orderBy: { minAmount: 'asc' },
            });
            return Result.ok(plainToInstance(TaxBracketDto, values));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch tax brackets');
        }
    }

    async deleteAsync(id: string, userId: string): Promise<Result<void>> {
        try {
            const exists = await this.prisma.taxBracket.findUnique({
                where: { id, isDeleted: false },
            });
            if (!exists) return Result.fail('Tax bracket not found');

            await this.prisma.taxBracket.update({
                where: { id },
                data: {
                    isDeleted: true,
                    performBy: userId,
                },
            });
            return Result.ok();
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to delete tax bracket');
        }
    }
}

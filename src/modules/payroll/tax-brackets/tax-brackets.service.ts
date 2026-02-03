import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTaxBracketDto } from './dtos/create-tax-bracket.dto';
import { TaxBracketDto } from './dtos/tax-bracket.dto';
import { TaxBracketQueryDto } from './dtos/tax-bracket-query.dto';
import { Result } from '../../../common/logic/result';
import { plainToInstance } from 'class-transformer';

import { ResultPagination } from 'src/common/logic/result-pagination';

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
            const currency = await this.prisma.client.currency.findUnique({
                where: { code: dto.currencyCode },
            });
            if (!currency) return Result.fail('Invalid Currency Code');

            const newValue = await this.prisma.client.taxBracket.create({
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

            const values = await this.prisma.client.taxBracket.findMany({
                where: whereClause,
                orderBy: { minAmount: 'asc' },
            });
            return Result.ok(
                values.map((v) => plainToInstance(TaxBracketDto, v)),
            );
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch tax brackets');
        }
    }

    async findAllPaginatedAsync(
        query: TaxBracketQueryDto,
    ): Promise<Result<ResultPagination<TaxBracketDto>>> {
        try {
            const {
                page = 1,
                limit = 10,
                country,
                year,
                bracketName,
                currencyCode,
                sortBy = 'minAmount',
                sortOrder = 'asc',
                skip,
            } = query;

            const where: Prisma.TaxBracketWhereInput = { isDeleted: false };
            if (country) where.countryCode = country;
            if (year) where.taxYear = year;
            if (bracketName)
                where.bracketName = {
                    contains: bracketName,
                    mode: 'insensitive',
                };
            if (currencyCode) where.currencyCode = currencyCode;

            const orderBy: Prisma.TaxBracketOrderByWithRelationInput = {};
            if (sortBy === 'minAmount') orderBy.minAmount = sortOrder;
            else if (sortBy === 'maxAmount') orderBy.maxAmount = sortOrder;
            else if (sortBy === 'taxRate') orderBy.taxRate = sortOrder;
            else if (sortBy === 'year') orderBy.taxYear = sortOrder;
            else if (sortBy === 'country') orderBy.countryCode = sortOrder;
            else if (sortBy === 'currencyCode')
                orderBy.currencyCode = sortOrder;
            else if (sortBy === 'bracketName') orderBy.bracketName = sortOrder;
            else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

            const [total, values] = await Promise.all([
                this.prisma.client.taxBracket.count({ where }),
                this.prisma.client.taxBracket.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                }),
            ]);

            const dtos = values.map((v) => plainToInstance(TaxBracketDto, v));
            return Result.ok(ResultPagination.of(dtos, total, page, limit));
        } catch (error) {
            this.logger.error(error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
    }

    async findAllFilteredAsync(
        query: TaxBracketQueryDto,
    ): Promise<Result<ResultPagination<TaxBracketDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return paginationResult;
        } catch (error) {
            this.logger.error('Failed to fetch filtered tax brackets', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
    }

    async deleteAsync(id: string, userId: string): Promise<Result<void>> {
        try {
            const exists = await this.prisma.client.taxBracket.findUnique({
                where: { id, isDeleted: false },
            });
            if (!exists) return Result.fail('Tax bracket not found');

            await this.prisma.client.taxBracket.update({
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

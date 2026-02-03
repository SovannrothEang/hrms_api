import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { CreateCurrencyDto } from './dtos/create-currency.dto';
import { CurrencyDto } from './dtos/currency.dto';
import { CurrencyQueryDto } from './dtos/currency-query.dto';
import { Result } from '../../../common/logic/result';
import { plainToInstance } from 'class-transformer';

import { ResultPagination } from 'src/common/logic/result-pagination';
import { Prisma } from '@prisma/client';

@Injectable()
export class CurrenciesService {
    private readonly logger = new Logger(CurrenciesService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreateCurrencyDto,
        userId: string,
    ): Promise<Result<CurrencyDto>> {
        try {
            // Check for existing code
            const existing = await this.prisma.client.currency.findUnique({
                where: { code: dto.code },
            });

            if (existing) {
                if (existing.isDeleted) {
                    // Reactivate if deleted
                    const reactivated =
                        await this.prisma.client.currency.update({
                            where: { id: existing.id },
                            data: {
                                isDeleted: false,
                                isActive: true,
                                name: dto.name,
                                symbol: dto.symbol,
                                country: dto.country,
                                performBy: userId,
                            },
                        });
                    return Result.ok(plainToInstance(CurrencyDto, reactivated));
                }
                return Result.fail('Currency code already exists');
            }

            const newValue = await this.prisma.client.currency.create({
                data: {
                    ...dto,
                    performBy: userId,
                },
            });

            return Result.ok(plainToInstance(CurrencyDto, newValue));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to create currency');
        }
    }

    async findAllAsync(): Promise<Result<CurrencyDto[]>> {
        try {
            const values = await this.prisma.client.currency.findMany({
                where: { isDeleted: false },
            });
            return Result.ok(
                values.map((v) => plainToInstance(CurrencyDto, v)),
            );
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch currencies');
        }
    }

    async findAllPaginatedAsync(
        query: CurrencyQueryDto,
    ): Promise<Result<ResultPagination<CurrencyDto>>> {
        try {
            const {
                page = 1,
                limit = 10,
                code,
                name,
                country,
                sortBy = 'code',
                sortOrder = 'asc',
                skip,
            } = query;

            const where: Prisma.CurrencyWhereInput = { isDeleted: false };
            if (code) where.code = { contains: code, mode: 'insensitive' };
            if (name) where.name = { contains: name, mode: 'insensitive' };
            if (country)
                where.country = { contains: country, mode: 'insensitive' };

            const orderBy: Prisma.CurrencyOrderByWithRelationInput = {};
            if (sortBy === 'code') orderBy.code = sortOrder;
            else if (sortBy === 'name') orderBy.name = sortOrder;
            else if (sortBy === 'country') orderBy.country = sortOrder;
            else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

            const [total, values] = await Promise.all([
                this.prisma.client.currency.count({ where }),
                this.prisma.client.currency.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                }),
            ]);

            const dtos = values.map((v) => plainToInstance(CurrencyDto, v));
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
        query: CurrencyQueryDto,
    ): Promise<Result<ResultPagination<CurrencyDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return paginationResult;
        } catch (error) {
            this.logger.error('Failed to fetch filtered currencies', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
    }

    async findOneByIdAsync(id: string): Promise<Result<CurrencyDto>> {
        try {
            const value = await this.prisma.client.currency.findUnique({
                where: { id, isDeleted: false },
            });
            if (!value) return Result.fail('Currency not found');
            return Result.ok(plainToInstance(CurrencyDto, value));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch currency');
        }
    }

    async deleteAsync(id: string, userId: string): Promise<Result<void>> {
        try {
            const exists = await this.prisma.client.currency.findFirst({
                where: { id },
                select: { id: true },
            });
            if (!exists) return Result.fail('Currency not found');

            await this.prisma.client.currency.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    performBy: userId,
                },
            });
            return Result.ok();
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to delete currency');
        }
    }
}

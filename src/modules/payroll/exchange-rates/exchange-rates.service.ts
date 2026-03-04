import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { CreateExchangeRateDto } from './dtos/create-exchange-rate.dto';
import { ExchangeRateDto } from './dtos/exchange-rate.dto';
import { Result } from '../../../common/logic/result';
import { DecimalNumber } from 'src/config/decimal-number';

@Injectable()
export class ExchangeRatesService {
    private readonly logger = new Logger(ExchangeRatesService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreateExchangeRateDto,
        userId: string,
    ): Promise<Result<ExchangeRateDto>> {
        try {
            const date = new Date(dto.date);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // Check for existing for that date
            const existing = await this.prisma.client.exchangeRate.findFirst({
                where: {
                    fromCurrencyCode: dto.fromCurrencyCode,
                    toCurrencyCode: dto.toCurrencyCode,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    isDeleted: false,
                },
            });

            let result;
            if (existing) {
                result = await this.prisma.client.exchangeRate.update({
                    where: { id: existing.id },
                    data: {
                        rate: dto.rate,
                        performBy: userId,
                    },
                });
            } else {
                result = await this.prisma.client.exchangeRate.create({
                    data: {
                        fromCurrencyCode: dto.fromCurrencyCode,
                        toCurrencyCode: dto.toCurrencyCode,
                        rate: dto.rate,
                        date: new Date(dto.date),
                        performBy: userId,
                    },
                });
            }

            return Result.ok(this.mapToDto(result));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to save exchange rate');
        }
    }

    async findAllAsync(): Promise<Result<ExchangeRateDto[]>> {
        try {
            const rates = await this.prisma.client.exchangeRate.findMany({
                where: { isDeleted: false },
                orderBy: { date: 'desc' },
                take: 100,
            });
            return Result.ok(rates.map((r) => this.mapToDto(r)));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch exchange rates');
        }
    }

    async getLatestRateAsync(
        from: string,
        to: string,
    ): Promise<Result<number>> {
        try {
            // 1. Direct match (e.g. USD -> KHR)
            const directRate = await this.prisma.client.exchangeRate.findFirst({
                where: {
                    fromCurrencyCode: from,
                    toCurrencyCode: to,
                    isDeleted: false,
                },
                orderBy: { date: 'desc' },
            });

            if (directRate) return Result.ok(Number(directRate.rate));

            // 2. Inverse match (e.g. KHR -> USD if only USD -> KHR exists)
            const inverseRate = await this.prisma.client.exchangeRate.findFirst(
                {
                    where: {
                        fromCurrencyCode: to,
                        toCurrencyCode: from,
                        isDeleted: false,
                    },
                    orderBy: { date: 'desc' },
                },
            );

            if (inverseRate) return Result.ok(1 / Number(inverseRate.rate));

            return Result.fail(
                `No exchange rate found between ${from} and ${to}`,
            );
        } catch (error) {
            return Result.fail('Error fetching exchange rate');
        }
    }

    private mapToDto(r: any): ExchangeRateDto {
        return {
            id: r.id,
            fromCurrencyCode: r.fromCurrencyCode,
            toCurrencyCode: r.toCurrencyCode,
            rate: new DecimalNumber(r.rate),
            date: r.date,
            createdAt: r.createdAt,
        };
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { CreateCurrencyDto } from './dtos/create-currency.dto';
import { CurrencyDto } from './dtos/currency.dto';
import { Result } from '../../../common/logic/result';
import { plainToInstance } from 'class-transformer';

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
            const existing = await this.prisma.currency.findUnique({
                where: { code: dto.code },
            });

            if (existing) {
                if (existing.isDeleted) {
                    // Reactivate if deleted
                    const reactivated = await this.prisma.currency.update({
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

            const newValue = await this.prisma.currency.create({
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
            const values = await this.prisma.currency.findMany({
                where: { isDeleted: false },
            });
            return Result.ok(plainToInstance(CurrencyDto, values));
        } catch (error) {
            this.logger.error(error);
            return Result.fail('Failed to fetch currencies');
        }
    }

    async findOneByIdAsync(id: string): Promise<Result<CurrencyDto>> {
        try {
            const value = await this.prisma.currency.findUnique({
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
            const exists = await this.prisma.currency.findFirst({
                where: { id },
                select: { id: true },
            });
            if (!exists) return Result.fail('Currency not found');

            await this.prisma.currency.update({
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

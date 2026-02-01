import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/logic/result';
import { CreatePublicHolidayDto } from './dtos/create-public-holiday.dto';
import { PublicHolidayDto } from './dtos/public-holiday.dto';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../common/services/prisma/prisma.service';

import { ResultPagination } from 'src/common/logic/result-pagination';

@Injectable()
export class PublicHolidaysService {
    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreatePublicHolidayDto,
        performBy: string,
    ): Promise<Result<PublicHolidayDto>> {
        const holiday = await this.prisma.client.publicHoliday.create({
            data: {
                name: dto.name,
                date: dto.date,
                isRecurring: dto.isRecurring ?? false,
                performBy,
            },
        });
        return Result.ok(plainToInstance(PublicHolidayDto, holiday));
    }

    async findAllAsync(): Promise<Result<PublicHolidayDto[]>> {
        const holidays = await this.prisma.client.publicHoliday.findMany({
            where: { isDeleted: false },
            orderBy: { date: 'asc' },
        });
        return Result.ok(
            holidays.map((h) => plainToInstance(PublicHolidayDto, h)),
        );
    }

    async findAllPaginatedAsync(
        page: number,
        limit: number,
    ): Promise<ResultPagination<PublicHolidayDto>> {
        const skip = (page - 1) * limit;

        const [total, holidays] = await Promise.all([
            this.prisma.client.publicHoliday.count({
                where: { isDeleted: false },
            }),
            this.prisma.client.publicHoliday.findMany({
                where: { isDeleted: false },
                skip,
                take: limit,
                orderBy: { date: 'asc' },
            }),
        ]);

        const dtos = holidays.map((h) => plainToInstance(PublicHolidayDto, h));
        return ResultPagination.of(dtos, total, page, limit);
    }

    async findOneByIdAsync(id: string): Promise<Result<PublicHolidayDto>> {
        const holiday = await this.prisma.client.publicHoliday.findUnique({
            where: { id },
        });
        if (!holiday || holiday.isDeleted)
            return Result.fail('Holiday not found');
        return Result.ok(plainToInstance(PublicHolidayDto, holiday));
    }

    async deleteAsync(id: string, performBy: string): Promise<Result<void>> {
        const holiday = await this.prisma.client.publicHoliday.findUnique({
            where: { id },
        });
        if (!holiday || holiday.isDeleted)
            return Result.fail('Holiday not found');

        await this.prisma.client.publicHoliday.update({
            where: { id },
            data: { isDeleted: true, performBy },
        });
        return Result.ok();
    }
}

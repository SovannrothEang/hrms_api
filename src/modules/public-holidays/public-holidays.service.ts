import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/logic/result';
import { CreatePublicHolidayDto } from './dtos/create-public-holiday.dto';
import { PublicHolidayDto } from './dtos/public-holiday.dto';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../common/services/prisma/prisma.service';

@Injectable()
export class PublicHolidaysService {
    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreatePublicHolidayDto,
        performBy: string,
    ): Promise<Result<PublicHolidayDto>> {
        const holiday = await this.prisma.publicHoliday.create({
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
        const holidays = await this.prisma.publicHoliday.findMany({
            where: { isDeleted: false },
            orderBy: { date: 'asc' },
        });
        return Result.ok(
            holidays.map((h) => plainToInstance(PublicHolidayDto, h)),
        );
    }

    async findOneByIdAsync(id: string): Promise<Result<PublicHolidayDto>> {
        const holiday = await this.prisma.publicHoliday.findUnique({
            where: { id },
        });
        if (!holiday || holiday.isDeleted)
            return Result.fail('Holiday not found');
        return Result.ok(plainToInstance(PublicHolidayDto, holiday));
    }

    async deleteAsync(id: string, performBy: string): Promise<Result<void>> {
        const holiday = await this.prisma.publicHoliday.findUnique({
            where: { id },
        });
        if (!holiday || holiday.isDeleted)
            return Result.fail('Holiday not found');

        await this.prisma.publicHoliday.update({
            where: { id },
            data: { isDeleted: true, performBy },
        });
        return Result.ok();
    }
}

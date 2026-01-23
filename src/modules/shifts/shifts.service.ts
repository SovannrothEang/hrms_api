import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import { Result } from 'src/common/logic/result';
import { CreateShiftDto } from './dtos/create-shift.dto';
import { ShiftDto } from './dtos/shift.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ShiftsService {
    constructor(private readonly prisma: PrismaService) {}

    async createAsync(
        dto: CreateShiftDto,
        performBy: string,
    ): Promise<Result<ShiftDto>> {
        // Parse time strings 'HH:mm' to dummy Date objects (e.g. 1970-01-01T09:00:00Z)
        // Prisma/Postgres `Time` type maps to Javascript `Date` object usually (incomplete date).
        // Best practice: Store as Date object with fixed date part.
        const baseDate = '1970-01-01T';

        const shift = await this.prisma.client.shift.create({
            data: {
                name: dto.name,
                startTime: new Date(`${baseDate}${dto.startTime}:00Z`), // UTC? Or ISO
                endTime: new Date(`${baseDate}${dto.endTime}:00Z`),
                workDays: dto.workDays,
                gracePeriodMins: dto.gracePeriodMins ?? 0,
                performBy,
            },
        });

        return Result.ok(plainToInstance(ShiftDto, shift));
    }

    async findAllAsync(): Promise<Result<ShiftDto[]>> {
        const shifts = await this.prisma.client.shift.findMany({
            where: { isDeleted: false },
        });
        return Result.ok(shifts.map((s) => plainToInstance(ShiftDto, s)));
    }

    async findOneByIdAsync(id: string): Promise<Result<ShiftDto>> {
        const shift = await this.prisma.client.shift.findUnique({
            where: { id },
        });
        if (!shift || shift.isDeleted) return Result.fail('Shift not found');
        return Result.ok(plainToInstance(ShiftDto, shift));
    }

    async deleteAsync(id: string, performBy: string): Promise<Result<void>> {
        const shift = await this.prisma.client.shift.findUnique({
            where: { id },
        });
        if (!shift || shift.isDeleted) return Result.fail('Shift not found');

        await this.prisma.client.shift.update({
            where: { id },
            data: { isDeleted: true, performBy },
        });
        return Result.ok(); // void
    }
}

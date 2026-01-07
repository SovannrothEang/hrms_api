import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class ShiftDto {
    @ApiProperty()
    @Expose()
    id: string;

    @ApiProperty()
    @Expose()
    name: string;

    @ApiProperty()
    @Expose()
    @Transform(({ value }) => value ? value.toISOString().substring(11, 16) : null) // Convert Date to HH:mm string if strictly needed, or keep as Date
    startTime: Date;

    @ApiProperty()
    @Expose()
    @Transform(({ value }) => value ? value.toISOString().substring(11, 16) : null)
    endTime: Date;

    @ApiProperty()
    @Expose()
    workDays: string;

    @ApiProperty()
    @Expose()
    gracePeriodMins: number;
}

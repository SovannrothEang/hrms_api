import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PublicHolidayDto {
    @ApiProperty()
    @Expose()
    id: string;

    @ApiProperty()
    @Expose()
    name: string;

    @ApiProperty()
    @Expose()
    date: Date;

    @ApiProperty()
    @Expose()
    isRecurring: boolean;
}

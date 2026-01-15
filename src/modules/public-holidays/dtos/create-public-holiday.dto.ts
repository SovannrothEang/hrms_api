import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreatePublicHolidayDto {
    @ApiProperty({ example: 'New Year Day' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    date: Date;

    @ApiProperty({ example: true, default: false })
    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;
}

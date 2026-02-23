import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    MaxLength,
    IsInt,
    Min,
    Max,
    IsIn,
} from 'class-validator';

const TIMEZONES = [
    'UTC-12',
    'UTC-11',
    'UTC-10',
    'UTC-9',
    'UTC-8',
    'UTC-7',
    'UTC-6',
    'UTC-5',
    'UTC-4',
    'UTC-3',
    'UTC-2',
    'UTC-1',
    'UTC',
    'UTC+1',
    'UTC+2',
    'UTC+3',
    'UTC+4',
    'UTC+5',
    'UTC+6',
    'UTC+7',
    'UTC+8',
    'UTC+9',
    'UTC+10',
    'UTC+11',
    'UTC+12',
];

const DATE_FORMATS = ['mdy', 'dmy', 'ymd'];

const WORK_WEEK_STARTS = ['sunday', 'monday', 'saturday'];

export class UpdateCompanySettingsDto {
    @ApiProperty({ example: 'HRFlow Inc.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: 'hr@hrflow.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({ example: '(555) 123-4567' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiPropertyOptional({ example: '123 Business Street, Tech City' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiProperty({ example: 'USD' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5)
    baseCurrencyCode: string;

    @ApiProperty({ example: 1, description: 'Month number (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    fiscalYearStartMonth: number;

    @ApiPropertyOptional({
        example: 'UTC-8',
        enum: TIMEZONES,
    })
    @IsOptional()
    @IsString()
    @IsIn(TIMEZONES)
    timezone?: string;

    @ApiPropertyOptional({
        example: 'mdy',
        enum: DATE_FORMATS,
    })
    @IsOptional()
    @IsString()
    @IsIn(DATE_FORMATS)
    dateFormat?: string;

    @ApiPropertyOptional({
        example: 'monday',
        enum: WORK_WEEK_STARTS,
    })
    @IsOptional()
    @IsString()
    @IsIn(WORK_WEEK_STARTS)
    workWeekStarts?: string;
}

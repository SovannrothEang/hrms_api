import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsDateString,
    IsString,
    IsIn,
} from 'class-validator';

export class AttendanceQueryDto {
    @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Filter by employee ID',
    })
    @IsOptional()
    @IsString()
    employeeId?: string;

    @ApiPropertyOptional({
        description: 'Filter by date (start date)',
    })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by date (end date)',
    })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'])
    status?: string;

    @ApiPropertyOptional({
        description: 'Include performer and employee details in response',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    childIncluded?: boolean = false;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['date', 'checkInTime', 'createdAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['date', 'checkInTime', 'createdAt'])
    sortBy?: string = 'date';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }
}

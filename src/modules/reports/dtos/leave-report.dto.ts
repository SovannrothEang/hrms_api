import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class LeaveReportQueryDto {
    @ApiPropertyOptional({
        description: 'Start date for leave filter (ISO 8601 format)',
        example: '2026-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date for leave filter (ISO 8601 format)',
        example: '2026-12-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

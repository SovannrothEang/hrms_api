import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString, IsUUID } from 'class-validator';

export class AttendanceReportQueryDto {
    @ApiPropertyOptional({
        description: 'Start date for the report (ISO 8601 format)',
        example: '2026-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date for the report (ISO 8601 format)',
        example: '2026-01-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Filter by specific employee ID',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    employeeId?: string;
}

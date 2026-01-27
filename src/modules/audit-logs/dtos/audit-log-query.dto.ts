import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    IsDateString,
    IsIn,
    IsBoolean,
} from 'class-validator';

export class AuditLogQueryDto {
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
        description: 'Filter by user ID',
        example: 'user-uuid-123',
    })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by action', example: 'CREATE' })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({
        description: 'Filter by table name',
        example: 'employees',
    })
    @IsOptional()
    @IsString()
    tableName?: string;

    @ApiPropertyOptional({
        description: 'Filter by record ID',
        example: 'record-uuid-123',
    })
    @IsOptional()
    @IsString()
    recordId?: string;

    @ApiPropertyOptional({
        description: 'Start date filter',
        example: '2024-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date filter',
        example: '2024-12-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Filter by severity',
        example: 'INFO',
        enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    })
    @IsOptional()
    @IsIn(['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    severity?: string;

    @ApiPropertyOptional({
        description: 'Filter by success status',
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    success?: boolean;

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }
}

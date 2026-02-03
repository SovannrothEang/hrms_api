import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';

export class CurrencyQueryDto {
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
        description: 'Filter by code (contains search)',
    })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({
        description: 'Filter by name (contains search)',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Filter by country (contains search)',
    })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['code', 'name', 'country', 'createdAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['code', 'name', 'country', 'createdAt'])
    sortBy?: string = 'code';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'asc';

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }
}

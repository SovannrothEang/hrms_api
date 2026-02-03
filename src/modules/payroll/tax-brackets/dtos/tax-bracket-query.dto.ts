import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';

export class TaxBracketQueryDto {
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
        description: 'Filter by country code (exact match)',
    })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({
        description: 'Filter by tax year (exact match)',
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1900)
    @Max(2100)
    year?: number;

    @ApiPropertyOptional({
        description: 'Filter by bracket name (contains search)',
    })
    @IsOptional()
    @IsString()
    bracketName?: string;

    @ApiPropertyOptional({
        description: 'Filter by currency code (exact match)',
    })
    @IsOptional()
    @IsString()
    currencyCode?: string;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: [
            'minAmount',
            'maxAmount',
            'taxRate',
            'year',
            'country',
            'currencyCode',
            'bracketName',
            'createdAt',
        ],
    })
    @IsOptional()
    @IsString()
    @IsIn([
        'minAmount',
        'maxAmount',
        'taxRate',
        'year',
        'country',
        'currencyCode',
        'bracketName',
        'createdAt',
    ])
    sortBy?: string = 'minAmount';

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

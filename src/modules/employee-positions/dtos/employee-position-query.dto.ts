import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsString,
    IsIn,
} from 'class-validator';

export class EmployeePositionQueryDto {
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
        description: 'Filter by title (contains search)',
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Include employees and performer details in response',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    childIncluded?: boolean = false;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['title', 'createdAt', 'updatedAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['title', 'createdAt', 'updatedAt'])
    sortBy?: string = 'title';

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

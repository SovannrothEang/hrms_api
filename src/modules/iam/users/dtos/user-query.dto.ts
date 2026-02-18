import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsIn,
    IsDateString,
} from 'class-validator';
import { RoleName } from 'src/common/enums/roles.enum';

export class UserQueryDto {
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
        description:
            'Search in username or email (partial match, case-insensitive)',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by role name',
        enum: RoleName,
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.toUpperCase() : value,
    )
    @IsIn(Object.values(RoleName))
    role?: string;

    @ApiPropertyOptional({
        description: 'Filter by active status',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Filter by creation date (start date)',
    })
    @IsOptional()
    @IsDateString()
    createdAtFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by creation date (end date)',
    })
    @IsOptional()
    @IsDateString()
    createdAtTo?: string;

    @ApiPropertyOptional({
        description: 'Include employees',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    includeEmployees?: boolean;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['username', 'email', 'createdAt', 'updatedAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['username', 'email', 'createdAt', 'updatedAt'])
    sortBy?: string = 'username';

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

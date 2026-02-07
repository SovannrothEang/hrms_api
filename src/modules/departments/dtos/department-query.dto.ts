import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsIn,
} from 'class-validator';

export class DepartmentQueryDto {
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
            'Search by department name (partial match, case-insensitive)',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Filter by employee count range (min-max)',
    })
    @IsOptional()
    @IsString()
    employeeCountRange?: string;

    @ApiPropertyOptional({
        description: 'Filter by active status',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['department_name', 'createdAt', 'employeeCount'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['department_name', 'createdAt', 'employeeCount'])
    sortBy?: string = 'department_name';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'asc';

    @ApiPropertyOptional({
        description: 'Include employee data in response',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    includeEmployees?: boolean = false;

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }

    get employeeCountMin(): number | null {
        if (!this.employeeCountRange) return null;
        const [min] = this.employeeCountRange.split('-').map(Number);
        return isNaN(min) ? null : min;
    }

    get employeeCountMax(): number | null {
        if (!this.employeeCountRange) return null;
        const parts = this.employeeCountRange.split('-');
        const max = parts.length > 1 ? Number(parts[1]) : Number(parts[0]);
        return isNaN(max) ? null : max;
    }
}

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
    IsDateString,
} from 'class-validator';

export class EmployeeQueryDto {
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
        description: 'Search by employee code',
    })
    @IsOptional()
    @IsString()
    employeeCode?: string;

    @ApiPropertyOptional({
        description: 'Search by first name (partial match, case-insensitive)',
    })
    @IsOptional()
    @IsString()
    firstname?: string;

    @ApiPropertyOptional({
        description: 'Search by last name (partial match, case-insensitive)',
    })
    @IsOptional()
    @IsString()
    lastname?: string;

    @ApiPropertyOptional({
        description: 'Filter by department ID',
    })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({
        description: 'Filter by position ID',
    })
    @IsOptional()
    @IsString()
    positionId?: string;

    @ApiPropertyOptional({
        description: 'Filter by employment type',
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
    employmentType?: string;

    @ApiPropertyOptional({
        description: 'Filter by employee status',
        enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'])
    status?: string;

    @ApiPropertyOptional({
        description: 'Filter by active status',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Filter by hire date (start date)',
    })
    @IsOptional()
    @IsDateString()
    hireDateFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by hire date (end date)',
    })
    @IsOptional()
    @IsDateString()
    hireDateTo?: string;

    @ApiPropertyOptional({
        description: 'Filter by salary range (min-max)',
    })
    @IsOptional()
    @IsString()
    salaryRange?: string;

    @ApiPropertyOptional({
        description: 'Filter by gender',
        enum: ['male', 'female', 'unknown'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['male', 'female', 'unknown'])
    gender?: string;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: [
            'employeeCode',
            'firstname',
            'lastname',
            'hireDate',
            'salary',
            'createdAt',
        ],
    })
    @IsOptional()
    @IsString()
    @IsIn([
        'employeeCode',
        'firstname',
        'lastname',
        'hireDate',
        'salary',
        'createdAt',
    ])
    sortBy?: string = 'employeeCode';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'asc';

    @ApiPropertyOptional({
        description: 'Include department and position data in response',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    includeDetails?: boolean = false;

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }

    get salaryMin(): number | null {
        if (!this.salaryRange) return null;
        const [min] = this.salaryRange.split('-').map(Number);
        return isNaN(min) ? null : min;
    }

    get salaryMax(): number | null {
        if (!this.salaryRange) return null;
        const parts = this.salaryRange.split('-');
        const max = parts.length > 1 ? Number(parts[1]) : Number(parts[0]);
        return isNaN(max) ? null : max;
    }
}

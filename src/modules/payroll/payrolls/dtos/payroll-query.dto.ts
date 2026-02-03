import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { PayrollStatus } from '../payrolls.service';

export class PayrollQueryDto {
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
        description: 'Filter by status',
        enum: Object.values(PayrollStatus),
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(PayrollStatus))
    status?: string;

    @ApiPropertyOptional({
        description: 'Filter by year',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    @Max(2100)
    year?: number;

    @ApiPropertyOptional({
        description: 'Filter by month (1-12)',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['payPeriodStart', 'createdAt', 'updatedAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['payPeriodStart', 'createdAt', 'updatedAt'])
    sortBy?: string = 'payPeriodStart';

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

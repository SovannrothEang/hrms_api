import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsDateString,
    IsString,
    IsIn,
} from 'class-validator';
import { LeaveStatus } from 'src/common/enums/leave-status.enum';
import { LeaveType } from 'src/common/enums/leave-type.enum';

export class LeaveQueryDto {
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
        description: 'Filter by approver ID',
    })
    @IsOptional()
    @IsString()
    approverId?: string;

    @ApiPropertyOptional({
        description: 'Filter by leave type',
        enum: Object.values(LeaveType),
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(LeaveType))
    leaveType?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: Object.values(LeaveStatus),
    })
    @IsOptional()
    @IsString()
    @IsIn(Object.values(LeaveStatus))
    status?: string;

    @ApiPropertyOptional({
        description: 'Filter by start date (from)',
    })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by end date (to)',
    })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({
        description: 'Include approver and performer details in response',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    childIncluded?: boolean = false;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: ['startDate', 'endDate', 'requestDate', 'createdAt'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['startDate', 'endDate', 'requestDate', 'createdAt'])
    sortBy?: string = 'startDate';

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

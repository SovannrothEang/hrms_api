import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class LeaveBalanceQueryDto {
    @ApiPropertyOptional({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Filter by employee ID',
    })
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional({ example: 2024, description: 'Filter by year' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
    year?: number;

    @ApiPropertyOptional({
        example: 'ANNUAL_LEAVE',
        description: 'Filter by leave type',
    })
    @IsOptional()
    @IsString()
    leaveType?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
    page?: number;

    @ApiPropertyOptional({ example: 10, description: 'Items per page' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
    limit?: number;

    get skip(): number {
        return ((this.page || 1) - 1) * (this.limit || 10);
    }
}

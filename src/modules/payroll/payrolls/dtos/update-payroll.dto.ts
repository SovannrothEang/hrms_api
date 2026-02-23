import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsDateString } from 'class-validator';

export class UpdatePayrollDto {
    @ApiPropertyOptional({
        example: '2026-01-01',
        description: 'Pay period start date',
    })
    @IsOptional()
    @IsDateString()
    payPeriodStart?: string;

    @ApiPropertyOptional({
        example: '2026-01-31',
        description: 'Pay period end date',
    })
    @IsOptional()
    @IsDateString()
    payPeriodEnd?: string;

    @ApiPropertyOptional({
        example: 10,
        description: 'Overtime hours worked',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    overtimeHours?: number;

    @ApiPropertyOptional({
        example: 500,
        description: 'Bonus amount',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    bonus?: number;

    @ApiPropertyOptional({
        example: 100,
        description: 'Additional deductions',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    deductions?: number;

    @ApiPropertyOptional({
        example: 2500,
        description: 'Override basic salary',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    basicSalaryOverride?: number;
}

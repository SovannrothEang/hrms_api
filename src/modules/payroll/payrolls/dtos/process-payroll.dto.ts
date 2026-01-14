import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ProcessPayrollDto {
    @ApiProperty({ example: 'uuid-employee-id', description: 'Employee ID' })
    @IsNotEmpty()
    @IsUUID()
    employeeId: string;

    @ApiProperty({ example: '2026-01-01', description: 'Pay period start date' })
    @IsNotEmpty()
    @IsDateString()
    payPeriodStart: string;

    @ApiProperty({ example: '2026-01-31', description: 'Pay period end date' })
    @IsNotEmpty()
    @IsDateString()
    payPeriodEnd: string;

    @ApiProperty({ example: 'USD', description: 'Currency code for payroll' })
    @IsNotEmpty()
    @IsString()
    currencyCode: string;

    @ApiPropertyOptional({ example: 10, description: 'Overtime hours worked', default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    overtimeHours?: number;

    @ApiPropertyOptional({ example: 500, description: 'Bonus amount', default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    bonus?: number;

    @ApiPropertyOptional({ example: 100, description: 'Additional deductions', default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    deductions?: number;

    @ApiPropertyOptional({ example: 2500, description: 'Override basic salary (if not using position salary)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    basicSalaryOverride?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class GeneratePayrollDto {
    @ApiProperty({
        example: '2026-01-01',
        description: 'Pay period start date',
    })
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

    @ApiPropertyOptional({
        example: 'uuid-department-id',
        description:
            'Department ID to generate payroll for all active employees in this department',
    })
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiPropertyOptional({
        example: ['uuid-employee-1', 'uuid-employee-2'],
        description: 'Specific employee IDs to generate payroll for',
    })
    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true })
    employeeIds?: string[];
}

export class GeneratePayrollResultDto {
    @ApiProperty({ example: 10 })
    totalGenerated: number;

    @ApiProperty({ example: 2 })
    totalSkipped: number;

    @ApiProperty({ example: 0 })
    totalFailed: number;

    @ApiProperty({ example: ['uuid-payroll-1', 'uuid-payroll-2'] })
    generatedPayrollIds: string[];

    @ApiProperty({
        example: [
            {
                employeeId: 'uuid-1',
                reason: 'Payroll already exists for period',
            },
        ],
    })
    skippedEmployees: {
        employeeId: string;
        employeeName: string;
        reason: string;
    }[];

    @ApiProperty({ example: [] })
    failedEmployees: {
        employeeId: string;
        employeeName: string;
        error: string;
    }[];
}

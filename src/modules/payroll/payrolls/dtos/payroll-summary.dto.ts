import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayrollSummaryByStatusDto {
    @ApiProperty({ example: 'PENDING' })
    status: string;

    @ApiProperty({ example: 5 })
    count: number;

    @ApiProperty({ example: 25000.0 })
    totalAmount: number;
}

export class PayrollSummaryByDepartmentDto {
    @ApiProperty({ example: 'Engineering' })
    department: string;

    @ApiProperty({ example: 10 })
    employeeCount: number;

    @ApiProperty({ example: 50000.0 })
    totalSalary: number;

    @ApiProperty({ example: 5000.0 })
    totalDeductions: number;

    @ApiProperty({ example: 45000.0 })
    totalNetSalary: number;
}

export class PayrollSummaryDto {
    @ApiProperty({ example: 100 })
    totalPayrolls: number;

    @ApiProperty({ example: 500000.0 })
    totalGrossSalary: number;

    @ApiProperty({ example: 50000.0 })
    totalDeductions: number;

    @ApiProperty({ example: 450000.0 })
    totalNetSalary: number;

    @ApiProperty({ example: 10000.0 })
    totalTax: number;

    @ApiProperty({ example: 5000.0 })
    totalOvertimePay: number;

    @ApiProperty({ example: 2000.0 })
    totalBonus: number;

    @ApiProperty({ type: [PayrollSummaryByStatusDto] })
    byStatus: PayrollSummaryByStatusDto[];

    @ApiPropertyOptional({ type: [PayrollSummaryByDepartmentDto] })
    byDepartment?: PayrollSummaryByDepartmentDto[];
}

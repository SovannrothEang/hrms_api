import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/client';
import { DecimalNumber } from '../../../../config/decimal-number';
import { PayrollItemDto } from './payroll-item.dto';

// Transform Decimal/number/string to number (handles null/undefined gracefully)
const toNumber = ({
    value,
}: {
    value: any;
}) => {
    if (value === null || value === undefined) return null;
    return Number(value);
};

@Exclude()
export class TaxCalculationDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 3000.0 })
    @Transform(toNumber)
    grossIncome: number | null;

    @Expose()
    @ApiProperty({ example: 3000.0 })
    @Transform(toNumber)
    taxableIncome: number | null;

    @Expose()
    @ApiProperty({ example: 150.0 })
    @Transform(toNumber)
    taxAmount: number | null;

    @Expose()
    @ApiProperty({ example: 0.05 })
    @Transform(toNumber)
    taxRateUsed: number | null;

    @Expose()
    @ApiProperty({ example: 'uuid-bracket-id' })
    taxBracketId: string;
}

@Exclude()
export class PayrollDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'uuid-employee-id' })
    employeeId: string;

    @Expose()
    @ApiProperty({ example: 'USD' })
    currencyCode: string;

    @Expose()
    @ApiPropertyOptional({ example: 'KHR' })
    baseCurrencyCode?: string;

    @Expose()
    @ApiProperty({ example: '2026-01-01' })
    payPeriodStart: Date;

    @Expose()
    @ApiProperty({ example: '2026-01-31' })
    payPeriodEnd: Date;

    @Expose()
    @ApiPropertyOptional({ example: '2026-02-05' })
    paymentDate?: Date;

    @Expose()
    @ApiProperty({ example: 2500.0 })
    @Transform(toNumber)
    basicSalary: number | null;

    @Expose()
    @ApiProperty({ example: 10 })
    @Transform(toNumber)
    overtimeHrs: number | null;

    @Expose()
    @ApiProperty({ example: 23.44 })
    @Transform(toNumber)
    overtimeRate: number | null;

    @Expose()
    @ApiProperty({ example: 500.0 })
    @Transform(toNumber)
    bonus: number | null;

    @Expose()
    @ApiProperty({ example: 100.0 })
    @Transform(toNumber)
    deductions: number | null;

    @Expose()
    @ApiProperty({ example: 2850.0 })
    @Transform(toNumber)
    netSalary: number | null;

    @Expose()
    @ApiProperty({
        example: 'PENDING',
        description: 'Status: PENDING, PROCESSED, PAID',
    })
    status: string;

    @Expose()
    @ApiPropertyOptional()
    processedAt?: Date;

    @Expose()
    @ApiPropertyOptional({ type: [PayrollItemDto] })
    @Type(() => PayrollItemDto)
    items?: PayrollItemDto[];

    @Expose()
    @ApiPropertyOptional({ type: TaxCalculationDto })
    @Type(() => TaxCalculationDto)
    taxCalculation?: TaxCalculationDto;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/client';
import { DecimalNumber } from '../../../../config/decimal-number';
import { PayrollItemDto } from './payroll-item.dto';

// Transform Decimal/number/string to DecimalNumber (handles null/undefined gracefully)
const toDecimalNumber = ({ value }: { value: Decimal | number | string | null | undefined }) => {
    if (value === null || value === undefined) return null;
    return new DecimalNumber(value);
};

@Exclude()
export class TaxCalculationDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 3000.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    grossIncome: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 3000.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    taxableIncome: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 150.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    taxAmount: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 0.05 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    taxRateUsed: DecimalNumber | null;

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
    @ApiProperty({ example: 2500.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    basicSalary: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 10 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    overtimeHrs: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 23.44 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    overtimeRate: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 500.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    bonus: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 100.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    deductions: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 2850.00 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    netSalary: DecimalNumber | null;

    @Expose()
    @ApiProperty({ example: 'PENDING', description: 'Status: PENDING, PROCESSED, PAID' })
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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Exclude,
    Expose,
    Transform,
    Type,
} from 'class-transformer';
import {DecimalNumber, toDecimal} from '../../../../config/decimal-number';
import { PayrollItemDto } from './payroll-item.dto';

@Exclude()
export class TaxCalculationDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 3000.0 })
    @Transform(toDecimal)
    grossIncome: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 3000.0 })
    @Transform(toDecimal)
    taxableIncome: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 150.0 })
    @Transform(toDecimal)
    taxAmount: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 0.05 })
    @Transform(toDecimal)
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
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 2500.0 })
    @Transform(toDecimal)
    basicSalary: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 10 })
    @Transform(toDecimal)
    overtimeHrs: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 23.44 })
    @Transform(toDecimal)
    overtimeRate: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 500.0 })
    @Transform(toDecimal)
    bonus: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 100.0 })
    @Transform(toDecimal)
    deductions: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 2850.0 })
    @Transform(toDecimal)
    netSalary: DecimalNumber | null;

    @Expose()
    @ApiProperty({
        example: 'PENDING',
        description: 'Status: PENDING, PROCESSED, PAID',
    })
    status: string;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiPropertyOptional({ example: 4000.0 })
    @Transform(toDecimal)
    exchangeRate: DecimalNumber | null;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiPropertyOptional({ example: 11400000.0 })
    @Transform(toDecimal)
    baseCurrencyAmount: DecimalNumber | null;

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

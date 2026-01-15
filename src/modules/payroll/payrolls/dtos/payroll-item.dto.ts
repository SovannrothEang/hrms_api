import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/client';
import { DecimalNumber } from '../../../../config/decimal-number';

// Transform Decimal/number/string to DecimalNumber (handles null/undefined gracefully)
const toDecimalNumber = ({
    value,
}: {
    value: Decimal | number | string | null | undefined;
}) => {
    if (value === null || value === undefined) return null;
    return new DecimalNumber(value);
};

@Exclude()
export class PayrollItemDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'uuid-payroll-id' })
    payrollId: string;

    @Expose()
    @ApiProperty({
        example: 'EARNING',
        description: 'Item type: EARNING or DEDUCTION',
    })
    itemType: string;

    @Expose()
    @ApiProperty({ example: 'Basic Salary' })
    itemName: string;

    @Expose()
    @ApiProperty({ example: 2500.0 })
    @Type(() => DecimalNumber)
    @Transform(toDecimalNumber)
    amount: DecimalNumber | null;

    @Expose()
    @ApiPropertyOptional({ example: 'USD' })
    currencyCode?: string;

    @Expose()
    @ApiPropertyOptional({ example: 'Monthly base salary' })
    description?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/client';
import { DecimalNumber } from '../../../../config/decimal-number';

// Transform Decimal/number/string to number (handles null/undefined gracefully)
const toNumber = ({
    value,
}: {
    value: Decimal | number | string | null | undefined;
}) => {
    if (value === null || value === undefined) return null;
    return Number(value);
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
    @Transform(toNumber)
    amount: number | null;

    @Expose()
    @ApiPropertyOptional({ example: 'USD' })
    currencyCode?: string;

    @Expose()
    @ApiPropertyOptional({ example: 'Monthly base salary' })
    description?: string;
}

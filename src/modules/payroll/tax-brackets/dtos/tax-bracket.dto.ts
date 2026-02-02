import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { DecimalNumber } from '../../../../config/decimal-number';
import { Decimal } from '@prisma/client/runtime/client';

const toDecimal = ({
    value,
}: {
    value: string | number | Decimal | null | undefined;
}) => {
    if (value === null || value === undefined) return null;
    return new DecimalNumber(value);
};

@Exclude()
export class TaxBracketDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'USD' })
    currencyCode: string;

    @Expose()
    @ApiProperty({ example: 'US' })
    countryCode: string;

    @Expose()
    @ApiProperty({ example: 2026 })
    taxYear: number;

    @Expose()
    @ApiProperty({ example: 'Tier 1' })
    bracketName: string;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 0 })
    @Transform(toDecimal)
    minAmount: DecimalNumber;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 10000 })
    @Transform(toDecimal)
    maxAmount: DecimalNumber;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 0.1 })
    @Transform(toDecimal)
    taxRate: DecimalNumber;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 0 })
    @Transform(toDecimal)
    fixedAmount: DecimalNumber;
}

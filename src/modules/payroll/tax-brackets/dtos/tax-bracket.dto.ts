import { ApiProperty } from '@nestjs/swagger';

export class TaxBracketDto {
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @ApiProperty({ example: 'USD' })
    currencyCode: string;

    @ApiProperty({ example: 'US' })
    countryCode: string;

    @ApiProperty({ example: 2026 })
    taxYear: number;

    @ApiProperty({ example: 'Tier 1' })
    bracketName: string;

    @ApiProperty({ example: 0 })
    minAmount: number;

    @ApiProperty({ example: 10000 })
    maxAmount: number;

    @ApiProperty({ example: 0.1 })
    taxRate: number;

    @ApiProperty({ example: 0 })
    fixedAmount: number;
}

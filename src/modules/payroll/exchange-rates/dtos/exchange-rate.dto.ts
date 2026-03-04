import { ApiProperty } from '@nestjs/swagger';
import { DecimalNumber } from 'src/config/decimal-number';

export class ExchangeRateDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    fromCurrencyCode: string;

    @ApiProperty()
    toCurrencyCode: string;

    @ApiProperty()
    rate: DecimalNumber;

    @ApiProperty()
    date: Date;

    @ApiProperty()
    createdAt: Date;
}

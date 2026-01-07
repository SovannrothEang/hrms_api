import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @ApiProperty({ example: 'USD' })
    code: string;

    @ApiProperty({ example: 'United States Dollar' })
    name: string;

    @ApiProperty({ example: '$' })
    symbol: string;

    @ApiProperty({ example: 'USA' })
    country: string;

    @ApiProperty({ example: true })
    isActive: boolean;
}

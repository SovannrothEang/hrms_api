import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsString,
    IsDateString,
    Min,
} from 'class-validator';

export class CreateExchangeRateDto {
    @ApiProperty({ example: 'USD' })
    @IsNotEmpty()
    @IsString()
    fromCurrencyCode: string;

    @ApiProperty({ example: 'KHR' })
    @IsNotEmpty()
    @IsString()
    toCurrencyCode: string;

    @ApiProperty({ example: 4000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    rate: number;

    @ApiProperty({ example: '2026-03-01' })
    @IsNotEmpty()
    @IsDateString()
    date: string;
}

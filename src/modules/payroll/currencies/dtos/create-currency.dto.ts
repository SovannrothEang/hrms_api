import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCurrencyDto {
    @ApiProperty({ example: 'USD', description: 'ISO 4217 Currency Code' })
    @IsNotEmpty()
    @IsString()
    @Length(3, 3)
    @Matches(/^[A-Z]{3}$/, {
        message: 'Currency code must be 3 uppercase letters',
    })
    code: string;

    @ApiProperty({
        example: 'United States Dollar',
        description: 'Currency Name',
    })
    @IsNotEmpty()
    @IsString()
    @Length(1, 50)
    name: string;

    @ApiProperty({ example: '$', description: 'Currency Symbol' })
    @IsNotEmpty()
    @IsString()
    @Length(1, 5)
    symbol: string;

    @ApiProperty({ example: 'USA', description: 'Country Name or Code' })
    @IsNotEmpty()
    @IsString()
    @Length(1, 15)
    country: string;
}

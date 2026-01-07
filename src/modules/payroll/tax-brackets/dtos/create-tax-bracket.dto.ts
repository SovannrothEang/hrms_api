import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Length, Min } from 'class-validator';

export class CreateTaxBracketDto {
    @ApiProperty({ example: 'USD', description: 'Currency Code' })
    @IsNotEmpty()
    @IsString()
    @Length(3, 3)
    currencyCode: string;

    @ApiProperty({ example: 'US', description: 'Country Code (ISO 2)' })
    @IsNotEmpty()
    @IsString()
    @Length(2, 2)
    countryCode: string;

    @ApiProperty({ example: 2026, description: 'Tax Year' })
    @IsNotEmpty()
    @IsNumber()
    @Min(2000)
    taxYear: number;

    @ApiProperty({ example: 'Tier 1', description: 'Bracket Name' })
    @IsNotEmpty()
    @IsString()
    bracketName: string;

    @ApiProperty({ example: 0, description: 'Minimum Income Amount for this bracket' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    minAmount: number;

    @ApiProperty({ example: 10000, description: 'Maximum Income Amount for this bracket' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    maxAmount: number;

    @ApiProperty({ example: 0.10, description: 'Tax Rate (e.g. 0.10 for 10%)' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    taxRate: number;

    @ApiProperty({ example: 0, description: 'Fixed Tax Amount (if any)' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    fixedAmount: number;
}

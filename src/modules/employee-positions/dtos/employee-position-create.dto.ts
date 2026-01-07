import { ApiProperty } from '@nestjs/swagger';
import {
    IsDecimal,
    IsNotEmpty,
    IsNumber,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class EmployeePositionCreateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @ApiProperty({ example: 'Software Engineer', required: true })
    title: string;

    @IsString()
    @MaxLength(255)
    @ApiProperty({ example: 'Software Engineer description', required: false })
    description: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsNotEmpty()
    @Min(0)
    @ApiProperty({ example: 700, required: true, minimum: 0 })
    salaryRangeMin: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsNotEmpty()
    @Max(99999999)
    @ApiProperty({ example: 1000, required: true, maximum: 9999999 })
    salaryRangeMax: number;
}

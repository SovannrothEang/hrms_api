import { ApiProperty } from '@nestjs/swagger';
import {
    IsDecimal,
    IsNotEmpty,
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

    @IsDecimal()
    @IsNotEmpty()
    @Min(0)
    @ApiProperty({ example: 0, required: true })
    salaryRangeMin: number;

    @IsDecimal()
    @IsNotEmpty()
    @Max(99999999)
    @ApiProperty({ example: 99999999, required: true })
    salaryRangeMax: number;
}

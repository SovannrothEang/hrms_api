import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    MaxLength,
    IsDecimal,
    Min,
    Max,
    IsOptional,
} from 'class-validator';

export class EmployeePositionUpdateDto {
    @IsString()
    @MaxLength(100)
    @ApiProperty({ example: 'Software Engineer' })
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiPropertyOptional({ example: "Software Engineer's description" })
    description?: string;

    @IsDecimal()
    @Min(0)
    @ApiProperty({ example: 0 })
    salaryRangeMin?: number;

    @IsDecimal()
    @Max(99999999)
    @ApiProperty({ example: 99999999 })
    salaryRangeMax?: number;
}

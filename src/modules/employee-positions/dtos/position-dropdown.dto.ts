import { ApiProperty } from '@nestjs/swagger';
import { DecimalNumber } from '../../../config/decimal-number';

export class PositionDropdownDto {
    @ApiProperty({ example: 'uuid-position-id' })
    id: string;

    @ApiProperty({ example: 'Software Engineer' })
    title: string;

    @ApiProperty({ type: DecimalNumber, example: 700 })
    salaryRangeMin: DecimalNumber;

    @ApiProperty({ type: DecimalNumber, example: 1000 })
    salaryRangeMax: DecimalNumber;
}

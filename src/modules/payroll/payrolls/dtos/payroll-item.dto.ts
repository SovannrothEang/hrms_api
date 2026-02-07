import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Exclude,
    Expose,
    Transform,
    Type,
} from 'class-transformer';
import {DecimalNumber, toDecimal} from '../../../../config/decimal-number';

@Exclude()
export class PayrollItemDto {
    @Expose()
    @ApiProperty({ example: 'uuid-string' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'uuid-payroll-id' })
    payrollId: string;

    @Expose()
    @ApiProperty({
        example: 'EARNING',
        description: 'Item type: EARNING or DEDUCTION',
    })
    itemType: string;

    @Expose()
    @ApiProperty({ example: 'Basic Salary' })
    itemName: string;

    @Expose()
    @Type(() => DecimalNumber)
    @ApiProperty({ example: 2500.0 })
    @Transform(toDecimal)
    amount: DecimalNumber | null;

    @Expose()
    @ApiPropertyOptional({ example: 'USD' })
    currencyCode?: string;

    @Expose()
    @ApiPropertyOptional({ example: 'Monthly base salary' })
    description?: string;
}

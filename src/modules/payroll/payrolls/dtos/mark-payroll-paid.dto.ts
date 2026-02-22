import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class MarkPayrollPaidDto {
    @ApiPropertyOptional({
        example: '2026-02-25',
        description: 'Payment date (defaults to current date if not provided)',
    })
    @IsOptional()
    @IsDateString()
    paymentDate?: string;
}

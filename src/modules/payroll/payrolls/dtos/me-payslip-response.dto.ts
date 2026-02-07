import { ApiProperty } from '@nestjs/swagger';
import {Transform, Type} from 'class-transformer';
import { DecimalNumber } from '../../../../config/decimal-number';
import {isDecimal} from "class-validator";

export class MePayslipSummaryDto {
    @ApiProperty({ example: 2850000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    gross_salary: DecimalNumber;

    @ApiProperty({ example: 335000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    total_deductions: DecimalNumber;

    @ApiProperty({ example: 2515000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    net_salary: DecimalNumber;
}

export class MePayslipRecordDto {
    @ApiProperty({ example: 'pay_2024_01' })
    id: string;

    @ApiProperty({ example: 'January 2024' })
    period: string;

    @ApiProperty({ example: '2024-01-01' })
    period_start: string;

    @ApiProperty({ example: '2024-01-31' })
    period_end: string;

    @ApiProperty({ example: '2024-01-25' })
    pay_date: string | null;

    @ApiProperty({ example: 'paid' })
    status: string;

    @ApiProperty({ type: MePayslipSummaryDto })
    summary: MePayslipSummaryDto;

    @ApiProperty({
        example:
            'https://cdn.company.com/payslips/pay_2024_01.pdf?token=signed_url_token',
    })
    pdf_url: string;
}

export class MePayslipYtdDto {
    @ApiProperty({ example: 2024 })
    year: number;

    @ApiProperty({ example: 2850000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    total_gross: DecimalNumber;

    @ApiProperty({ example: 135000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    total_tax: DecimalNumber;

    @ApiProperty({ example: 71250 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    total_nssf: DecimalNumber;

    @ApiProperty({ example: 2515000 })
    @Type(() => DecimalNumber)
    @Transform(isDecimal)
    total_net: DecimalNumber;
}

export class MePayslipResponseDto {
    @ApiProperty({ type: [MePayslipRecordDto] })
    records: MePayslipRecordDto[];

    @ApiProperty({ type: MePayslipYtdDto })
    ytd_summary: MePayslipYtdDto;
}

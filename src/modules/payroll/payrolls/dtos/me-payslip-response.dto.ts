import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class MePayslipSummaryDto {
    @ApiProperty({ example: 2850000 })
    @Expose({ name: 'gross_salary' })
    grossSalary: number;

    @ApiProperty({ example: 335000 })
    @Expose({ name: 'total_deductions' })
    totalDeductions: number;

    @ApiProperty({ example: 2515000 })
    @Expose({ name: 'net_salary' })
    netSalary: number;
}

export class MePayslipRecordDto {
    @ApiProperty({ example: 'pay_2024_01' })
    id: string;

    @ApiProperty({ example: 'January 2024' })
    period: string;

    @ApiProperty({ example: '2024-01-01' })
    @Expose({ name: 'period_start' })
    periodStart: string;

    @ApiProperty({ example: '2024-01-31' })
    @Expose({ name: 'period_end' })
    periodEnd: string;

    @ApiProperty({ example: '2024-01-25' })
    @Expose({ name: 'pay_date' })
    payDate: string | null;

    @ApiProperty({ example: 'paid' })
    status: string;

    @ApiProperty({ type: MePayslipSummaryDto })
    summary: MePayslipSummaryDto;

    @ApiProperty({
        example:
            'https://cdn.company.com/payslips/pay_2024_01.pdf?token=signed_url_token',
    })
    @Expose({ name: 'pdf_url' })
    pdfUrl: string;
}

export class MePayslipYtdDto {
    @ApiProperty({ example: 2024 })
    year: number;

    @ApiProperty({ example: 2850000 })
    @Expose({ name: 'total_gross' })
    totalGross: number;

    @ApiProperty({ example: 135000 })
    @Expose({ name: 'total_tax' })
    totalTax: number;

    @ApiProperty({ example: 71250 })
    @Expose({ name: 'total_nssf' })
    totalNssf: number;

    @ApiProperty({ example: 2515000 })
    @Expose({ name: 'total_net' })
    totalNet: number;
}

export class MePayslipResponseDto {
    @ApiProperty({ type: [MePayslipRecordDto] })
    @Type(() => MePayslipRecordDto)
    records: MePayslipRecordDto[];

    @ApiProperty({ type: MePayslipYtdDto })
    @Type(() => MePayslipYtdDto)
    @Expose({ name: 'ytd_summary' })
    ytdSummary: MePayslipYtdDto;
}

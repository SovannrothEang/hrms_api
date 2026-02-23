import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanySettingsResponseDto {
    @ApiProperty({ example: 'uuid' })
    id: string;

    @ApiProperty({ example: 'HRFlow Inc.' })
    name: string;

    @ApiPropertyOptional({ example: 'hr@hrflow.com' })
    email?: string;

    @ApiPropertyOptional({ example: '(555) 123-4567' })
    phone?: string;

    @ApiPropertyOptional({ example: '123 Business Street, Tech City' })
    address?: string;

    @ApiProperty({ example: 'USD' })
    baseCurrencyCode: string;

    @ApiProperty({ example: 1, description: 'Month number (1-12)' })
    fiscalYearStartMonth: number;

    @ApiProperty({ example: 'UTC-8' })
    timezone: string;

    @ApiProperty({ example: 'mdy' })
    dateFormat: string;

    @ApiProperty({ example: 'monday' })
    workWeekStarts: string;

    @ApiProperty({ example: '2024-01-01T00:00:00Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-01-01T00:00:00Z' })
    updatedAt: Date;
}

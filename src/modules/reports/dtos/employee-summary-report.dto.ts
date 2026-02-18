import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class EmployeeSummaryReportQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date for newHires/terminated filter (ISO 8601 format). Defaults to start of current month.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date for newHires/terminated filter (ISO 8601 format). Defaults to end of current month.',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

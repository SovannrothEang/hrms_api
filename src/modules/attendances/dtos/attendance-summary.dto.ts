import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AttendanceSummaryDto {
    @ApiProperty({
        example: 20,
        description: 'Total days present across all records',
    })
    @Expose({ name: 'days_present' })
    daysPresent: number;

    @ApiProperty({
        example: 1,
        description: 'Total late arrivals across all records',
    })
    @Expose({ name: 'late_count' })
    lateCount: number;

    @ApiProperty({
        example: 0,
        description: 'Total days absent across all records',
    })
    @Expose({ name: 'days_absent' })
    daysAbsent: number;

    @ApiProperty({
        example: 2,
        description: 'Total days on leave across all records',
    })
    @Expose({ name: 'days_on_leave' })
    daysOnLeave: number;

    @ApiProperty({
        example: 180.5,
        description: 'Total hours worked across all records',
    })
    @Expose({ name: 'total_hours_worked' })
    totalHoursWorked: number;

    @ApiProperty({
        example: 5.5,
        description: 'Total overtime hours across all records',
    })
    @Expose({ name: 'total_overtime_hours' })
    totalOvertimeHours: number;
}

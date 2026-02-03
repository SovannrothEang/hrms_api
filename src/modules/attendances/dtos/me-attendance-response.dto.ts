import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ClockInEventDto {
    @ApiProperty({ example: '08:29:45', nullable: true })
    @Expose()
    time: string | null;

    @ApiProperty({ example: 'HQ Floor 2', nullable: true })
    @Expose()
    location?: string;

    @ApiProperty({ example: false })
    @Expose({ name: 'is_late' })
    isLate: boolean = false;

    @ApiProperty({
        example: 'https://cdn.company.com/clock-photos/att001_in.jpg',
        nullable: true,
    })
    @Expose({ name: 'photo_url' })
    photoUrl?: string;
}

export class ClockOutEventDto {
    @ApiProperty({ example: '17:45:12', nullable: true })
    @Expose()
    time: string | null;

    @ApiProperty({ example: 'HQ Floor 2', nullable: true })
    @Expose()
    location?: string;

    @ApiProperty({ example: false })
    @Expose({ name: 'is_early' })
    isEarly: boolean = false;

    @ApiProperty({
        example: 'https://cdn.company.com/clock-photos/att001_out.jpg',
        nullable: true,
    })
    @Expose({ name: 'photo_url' })
    photoUrl?: string;
}

export class MeAttendanceRecordDto {
    @ApiProperty({ example: 'att_001' })
    @Expose()
    id: string;

    @ApiProperty({ example: '2024-01-15' })
    @Expose()
    date: string;

    @ApiProperty({ type: ClockInEventDto })
    @Expose({ name: 'clock_in' })
    @Type(() => ClockInEventDto)
    clockIn: ClockInEventDto;

    @ApiProperty({ type: ClockOutEventDto, nullable: true })
    @Expose({ name: 'clock_out' })
    @Type(() => ClockOutEventDto)
    clockOut: ClockOutEventDto | null;

    @ApiProperty({ example: 9.26 })
    @Expose({ name: 'hours_worked' })
    hoursWorked: number;

    @ApiProperty({ example: 0.75 })
    @Expose({ name: 'overtime_hours' })
    overtimeHours: number;

    @ApiProperty({ example: 'normal' })
    @Expose()
    status: string;

    @ApiProperty({ example: null, nullable: true })
    @Expose({ name: 'leave_type' })
    leaveType: string | null;
}

export class MeAttendanceSummaryDto {
    @ApiProperty({ example: 22 })
    @Expose({ name: 'total_days' })
    totalDays: number;

    @ApiProperty({ example: 20 })
    @Expose({ name: 'days_present' })
    daysPresent: number;

    @ApiProperty({ example: 0 })
    @Expose({ name: 'days_absent' })
    daysAbsent: number;

    @ApiProperty({ example: 2 })
    @Expose({ name: 'days_on_leave' })
    daysOnLeave: number;

    @ApiProperty({ example: 180.5 })
    @Expose({ name: 'total_hours_worked' })
    totalHoursWorked: number;

    @ApiProperty({ example: 5.5 })
    @Expose({ name: 'total_overtime_hours' })
    totalOvertimeHours: number;

    @ApiProperty({ example: 1 })
    @Expose({ name: 'late_count' })
    lateCount: number;

    @ApiProperty({ example: 0 })
    @Expose({ name: 'early_leave_count' })
    earlyLeaveCount: number;
}

export class MeAttendancePaginationDto {
    @ApiProperty({ example: 1 })
    @Expose()
    page: number;

    @ApiProperty({ example: 30 })
    @Expose()
    limit: number;

    @ApiProperty({ example: 22 })
    @Expose()
    total: number;

    @ApiProperty({ example: false })
    @Expose({ name: 'has_more' })
    hasMore: boolean;
}

export class MeAttendanceResponseDto {
    @ApiProperty({ type: [MeAttendanceRecordDto] })
    @Expose()
    @Type(() => MeAttendanceRecordDto)
    records: MeAttendanceRecordDto[];

    @ApiProperty({ type: MeAttendanceSummaryDto })
    @Expose()
    @Type(() => MeAttendanceSummaryDto)
    summary: MeAttendanceSummaryDto;

    @ApiProperty({ type: MeAttendancePaginationDto })
    @Expose()
    @Type(() => MeAttendancePaginationDto)
    pagination: MeAttendancePaginationDto;
}

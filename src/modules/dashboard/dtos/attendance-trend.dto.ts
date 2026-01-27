import { ApiProperty } from '@nestjs/swagger';

export class AttendanceTrendItemDto {
    @ApiProperty({ example: '2024-01-15', description: 'Date' })
    date: string;

    @ApiProperty({ example: 120, description: 'Number of employees present' })
    present: number;

    @ApiProperty({ example: 15, description: 'Number of employees absent' })
    absent: number;

    @ApiProperty({ example: 5, description: 'Number of employees late' })
    late: number;

    @ApiProperty({ example: 10, description: 'Number of employees on leave' })
    onLeave: number;
}

export class AttendanceTrendDto {
    @ApiProperty({ type: [AttendanceTrendItemDto] })
    trend: AttendanceTrendItemDto[];

    @ApiProperty({ example: 7, description: 'Number of days in trend' })
    days: number;
}

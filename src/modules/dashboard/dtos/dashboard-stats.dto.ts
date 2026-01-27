import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
    @ApiProperty({ example: 150, description: 'Total number of employees' })
    totalEmployees: number;

    @ApiProperty({
        example: 120,
        description: 'Number of employees present today',
    })
    presentToday: number;

    @ApiProperty({ example: 10, description: 'Number of employees on leave' })
    onLeave: number;

    @ApiProperty({
        example: 5,
        description: 'Number of pending leave requests',
    })
    pendingLeaveRequests: number;

    @ApiProperty({
        example: 20,
        description: 'Number of employees absent today',
    })
    absentToday: number;

    @ApiProperty({ example: 3, description: 'Number of employees late today' })
    lateToday: number;

    @ApiProperty({ example: 5, description: 'Number of departments' })
    totalDepartments: number;

    @ApiProperty({
        example: 10,
        description: 'Number of new employees this month',
    })
    newEmployeesThisMonth: number;
}

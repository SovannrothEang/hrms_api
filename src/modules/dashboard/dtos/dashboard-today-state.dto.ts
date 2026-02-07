import { ApiProperty } from '@nestjs/swagger';

export class DashboardTodayStateDto {
    @ApiProperty({
        example: 120,
        description:
            'Number of employees present today (checked in with PRESENT or LATE status)',
    })
    presentCount: number;

    @ApiProperty({
        example: 10,
        description: 'Number of employees on approved leave today',
    })
    onLeaveCount: number;

    @ApiProperty({
        example: 5,
        description: 'Total number of pending requests awaiting admin decision',
    })
    pendingRequestsCount: number;
}

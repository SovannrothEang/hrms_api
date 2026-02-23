import { ApiProperty } from '@nestjs/swagger';

export class LeaveRequestSummaryDto {
    @ApiProperty({ example: 50 })
    total_requests: number;

    @ApiProperty({ example: 15 })
    pending_count: number;

    @ApiProperty({ example: 30 })
    approved_count: number;

    @ApiProperty({ example: 5 })
    rejected_count: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class MeLeaveRequestDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: 'ANNUAL' })
    leave_type: string;

    @ApiProperty({ example: '2024-01-15' })
    start_date: string;

    @ApiProperty({ example: '2024-01-17' })
    end_date: string;

    @ApiProperty({ example: 3 })
    total_days: number;

    @ApiProperty({ example: 'Family vacation', nullable: true })
    reason: string | null;

    @ApiProperty({ example: 'PENDING' })
    status: string;

    @ApiProperty({ example: '2024-01-10T08:00:00.000Z' })
    request_date: string;

    @ApiProperty({ example: 'John Manager', nullable: true })
    approved_by: string | null;
}

export class MeLeaveRequestSummaryDto {
    @ApiProperty({ example: 5 })
    total_requests: number;

    @ApiProperty({ example: 2 })
    pending_count: number;

    @ApiProperty({ example: 2 })
    approved_count: number;

    @ApiProperty({ example: 1 })
    rejected_count: number;
}

export class MeLeaveRequestPaginationDto {
    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 5 })
    total: number;

    @ApiProperty({ example: false })
    has_more: boolean;
}

export class MeLeaveRequestResponseDto {
    @ApiProperty({ type: [MeLeaveRequestDto] })
    records: MeLeaveRequestDto[];

    @ApiProperty({ type: MeLeaveRequestSummaryDto })
    summary: MeLeaveRequestSummaryDto;

    @ApiProperty({ type: MeLeaveRequestPaginationDto })
    pagination: MeLeaveRequestPaginationDto;
}

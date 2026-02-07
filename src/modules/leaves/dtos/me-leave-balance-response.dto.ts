import { ApiProperty } from '@nestjs/swagger';

export class LeaveBalanceItemDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: 'ANNUAL' })
    leave_type: string;

    @ApiProperty({ example: 2024 })
    year: number;

    @ApiProperty({ example: 15 })
    total_days: number;

    @ApiProperty({ example: 5.5 })
    used_days: number;

    @ApiProperty({ example: 2 })
    pending_days: number;

    @ApiProperty({ example: 7.5 })
    available_days: number;
}

export class MeLeaveBalanceResponseDto {
    @ApiProperty({ type: [LeaveBalanceItemDto] })
    balances: LeaveBalanceItemDto[];

    @ApiProperty({ example: 2024 })
    year: number;
}

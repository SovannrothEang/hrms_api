import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class LeaveBalanceCreateDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsNotEmpty()
    @IsUUID()
    employeeId: string;

    @ApiProperty({ example: 'ANNUAL_LEAVE' })
    @IsNotEmpty()
    @IsString()
    leaveType: string;

    @ApiProperty({ example: 2024 })
    @IsNotEmpty()
    @IsNumber()
    year: number;

    @ApiProperty({ example: 15 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    totalDays: number;
}

export class LeaveBalanceUpdateDto {
    @ApiProperty({ example: 20 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    totalDays: number;
}

export class LeaveBalanceResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    employeeId: string;

    @ApiProperty({ example: 'ANNUAL_LEAVE' })
    leaveType: string;

    @ApiProperty({ example: 2024 })
    year: number;

    @ApiProperty({ example: 15 })
    totalDays: number;

    @ApiProperty({ example: 5 })
    usedDays: number;

    @ApiProperty({ example: 2 })
    pendingDays: number;

    @ApiProperty({ example: 8 })
    availableDays: number;

    @ApiProperty({ example: '2024-01-01T00:00:00Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-01-01T00:00:00Z' })
    updatedAt: Date;
}

export class EmployeeLeaveBalanceResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    employeeId: string;

    @ApiProperty({ example: 'John Doe' })
    employeeName: string;

    @ApiProperty({ type: [LeaveBalanceResponseDto] })
    balances: LeaveBalanceResponseDto[];

    @ApiProperty({ example: 2024 })
    year: number;
}

export class LeaveBalanceBulkCreateDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsNotEmpty()
    @IsUUID()
    employeeId: string;

    @ApiProperty({ example: 2024 })
    @IsNotEmpty()
    @IsNumber()
    year: number;

    @ApiProperty({
        example: {
            ANNUAL_LEAVE: 15,
            SICK_LEAVE: 10,
            CASUAL_LEAVE: 5,
        },
    })
    @IsNotEmpty()
    balances: Record<string, number>;
}

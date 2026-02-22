import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { LeaveType } from 'src/common/enums/leave-type.enum';

export class LeaveRequestCreateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: true, example: 'uuid-string' })
    employeeId: string;

    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ name: 'startDate', required: true, example: '2023-10-01' })
    startDate: Date;

    @IsDateString()
    @IsNotEmpty()
    @ApiProperty({ name: 'endDate', required: true, example: '2023-10-05' })
    endDate: Date;

    @IsEnum(LeaveType)
    @IsNotEmpty()
    @ApiProperty({
        name: 'leaveType',
        required: true,
        enum: LeaveType,
        example: LeaveType.ANNUAL_LEAVE,
    })
    leaveType: LeaveType;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    @ApiProperty({
        name: 'reason',
        required: false,
        example: 'Visiting family',
    })
    reason?: string;
}

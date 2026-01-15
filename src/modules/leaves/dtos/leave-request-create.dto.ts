import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

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

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @ApiProperty({ name: 'leaveType', required: true, example: 'ANNUAL' })
    leaveType: string;

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

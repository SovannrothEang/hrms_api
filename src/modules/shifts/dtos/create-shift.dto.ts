import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateShiftDto {
    @ApiProperty({ example: 'Morning Shift' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: '09:00', description: 'HH:mm format' })
    @IsNotEmpty()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:mm format' })
    startTime: string; // "09:00"

    @ApiProperty({ example: '18:00', description: 'HH:mm format' })
    @IsNotEmpty()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:mm format' })
    endTime: string; // "18:00"

    @ApiProperty({ example: '1,2,3,4,5', description: 'Comma separated days (1=Mon, 7=Sun)' })
    @IsNotEmpty()
    @IsString()
    workDays: string; // "1,2,3,4,5"

    @ApiProperty({ example: 15, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1440)
    gracePeriodMins?: number;
}

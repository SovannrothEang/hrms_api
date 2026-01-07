import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AttendanceCreateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: true })
    employeeId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @ApiProperty({ name: 'Status', required: true })
    status: string;

    @IsNotEmpty()
    @IsDate()
    @ApiProperty({ name: 'date', required: true })
    date: Date;

    @IsNotEmpty()
    @IsDate({})
    @ApiProperty({ name: 'checkInTime', required: true })
    checkInTime: Date;

    @IsNotEmpty()
    @IsDate()
    @ApiProperty({ name: 'checkOutTime', required: true })
    checkOutTime: Date;
}

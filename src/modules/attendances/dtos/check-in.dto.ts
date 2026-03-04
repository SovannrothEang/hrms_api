import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CheckInDto {
    @IsString()
    @IsOptional()
    @MaxLength(36)
    @ApiProperty({
        name: 'employeeId',
        required: false,
        example: 'uuid-string',
    })
    employeeId?: string;
    @IsString()
    @IsOptional()
    @ApiProperty({
        name: 'qrToken',
        required: false,
        example: 'signed-jwt-token',
    })
    qrToken?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: 'clientTime',
        required: false,
        example: '2024-03-04T14:00:00Z',
    })
    clientTime?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: 'clientTimezone',
        required: false,
        example: 'Asia/Phnom_Penh',
    })
    clientTimezone?: string;
}

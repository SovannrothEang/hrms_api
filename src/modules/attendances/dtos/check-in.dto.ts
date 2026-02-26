import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CheckInDto {
    @IsString()
    @IsOptional()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: false, example: 'uuid-string' })
    employeeId?: string;
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: 'qrToken',
        required: true,
        example: 'signed-jwt-token',
    })
    qrToken: string;
}

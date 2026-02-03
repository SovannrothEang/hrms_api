import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CheckInDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: true, example: 'uuid-string' })
    employeeId: string;
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: 'qrToken',
        required: true,
        example: 'signed-jwt-token',
    })
    qrToken: string;
}

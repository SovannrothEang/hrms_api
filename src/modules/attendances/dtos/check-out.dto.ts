import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CheckOutDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: true, example: 'uuid-string' })
    employeeId: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckOutDto {
    @IsString()
    @IsOptional()
    @MaxLength(36)
    @ApiProperty({ name: 'employeeId', required: false, example: 'uuid-string' })
    employeeId?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        name: 'notes',
        example: 'Worked on project X',
    })
    notes?: string;
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: 'qrToken',
        required: true,
        example: 'signed-jwt-token',
    })
    qrToken: string;
}

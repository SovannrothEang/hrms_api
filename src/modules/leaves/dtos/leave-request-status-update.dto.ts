import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LeaveRequestStatusUpdateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @ApiProperty({ name: 'status', required: true, example: 'APPROVED' })
    status: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    @ApiProperty({ name: 'approverId', required: true, example: 'uuid-string' })
    approverId: string;
}

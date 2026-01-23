import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ example: 'uuid-reset-token' })
    @IsNotEmpty()
    @IsString()
    token: string;

    @ApiProperty({ example: 'NewSecurePassword123!' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;
}

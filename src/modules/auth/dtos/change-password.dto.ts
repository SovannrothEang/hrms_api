import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({ example: 'OldSecurePassword123!' })
    @IsNotEmpty()
    @IsString()
    oldPassword: string;

    @ApiProperty({ example: 'NewSecurePassword123!' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;
}

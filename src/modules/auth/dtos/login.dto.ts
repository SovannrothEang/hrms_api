import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'john@example.com',
        description: 'Uer email address',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'securePassword123', description: 'User password' })
    @IsNotEmpty()
    @IsString()
    password: string;
}

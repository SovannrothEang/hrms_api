import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Valid email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', description: 'Strong password', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'securePassword123', description: 'Confirmation of password' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}

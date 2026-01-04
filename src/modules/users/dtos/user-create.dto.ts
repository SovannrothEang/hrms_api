import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export default class UserCreateDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({
    example: 'username',
    description: 'Username',
    required: true,
    type: String,
    maxLength: 50,
    minLength: 3,
  })
  username: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  @ApiProperty({
    example: 'example@gmail.com',
    description: 'Email',
    required: true,
    type: String,
    maxLength: 100,
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  @ApiProperty({
    example: 'password',
    description: 'Password',
    required: true,
    type: String,
    maxLength: 255,
    minLength: 8,
  })
  password: string;
}

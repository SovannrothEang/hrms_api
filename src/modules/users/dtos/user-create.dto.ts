import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class UserCreateDto {
  @IsNotEmpty()
  @IsString()
  UserName: string;

  @IsNotEmpty()
  @IsEmail()
  Email: string;

  @IsNotEmpty()
  @IsString()
  Password: string;

  @IsNotEmpty()
  @IsString()
  ConfirmPassword: string;
}

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export default class EmployeeCreateDto {
    @IsNotEmpty()
    @IsString()
    FirstName: string;

    @IsNotEmpty()
    @IsString()
    LastName: string;

    @IsNotEmpty()
    @IsString()
    Code: string;

    @IsNotEmpty()
    @IsEmail()
    Email: string;

    @IsNotEmpty()
    @IsString()
    UserName: string;

    Password: {
        Password: string;
        ConfirmPassword: string;
    };
}

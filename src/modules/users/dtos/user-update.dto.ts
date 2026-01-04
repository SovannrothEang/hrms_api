import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class UserUpdateDto {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    @ApiProperty({
        example: 'username',
        description: 'Username',
        required: false,
        type: String,
        maxLength: 50,
        minLength: 3,
    })
    username?: string;

    @IsEmail()
    @MaxLength(100)
    @ApiProperty({
        example: 'example@gmail.com',
        description: 'Email',
        required: false,
        type: String,
        maxLength: 100,
    })
    email?: string;
}
import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { RoleName } from 'src/common/enums/roles.enum';

export class UserUpdateDto {
    @IsOptional()
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

    @IsOptional()
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

    @IsOptional()
    @IsArray()
    // @IsEnum(RoleName, { each: true })
    @ApiProperty({
        example: [RoleName.ADMIN],
        description: 'Roles to assign to the user',
        required: false,
        isArray: true,
        enum: RoleName,
    })
    roles?: RoleName[];
}

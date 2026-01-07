import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class EmployeeCreateDto {
    @ApiProperty({ example: 'John' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(70)
    firstname: string;

    @ApiProperty({ example: 'Doe' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(70)
    lastname: string;

    @ApiProperty({ example: 'EMP001' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    employeeCode: string;

    @ApiProperty({ example: 1, description: '0: Male, 1: Female' })
    @IsNotEmpty()
    @IsEnum([0, 1])
    gender: number;

    @ApiProperty({ example: '1990-01-01' })
    @IsNotEmpty()
    @IsDateString()
    dob: string;

    @ApiProperty({ example: '123 Main St' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiProperty({ example: '2023-01-01' })
    @IsNotEmpty()
    @IsDateString()
    hireDate: string;

    @ApiProperty({ example: 'uuid-dept' })
    @IsNotEmpty()
    @IsString()
    departmentId: string;

    @ApiProperty({ example: 'uuid-pos' })
    @IsNotEmpty()
    @IsString()
    positionId: string;

    @ApiProperty({ example: 'uuid-manager', required: false })
    @IsOptional()
    @IsString()
    managerId?: string;

    // User Account Details
    @ApiProperty({ example: 'johndoe' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(25)
    username: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsNotEmpty()
    @IsEmail()
    @MaxLength(100)
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'uuid-role' })
    @IsNotEmpty()
    @IsString()
    roleId: string;
}

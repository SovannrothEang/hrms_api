import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEmail,
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmergencyContactCreateDto {
    @ApiPropertyOptional({ example: 'Jane Doe' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'Spouse' })
    @IsOptional()
    @IsString()
    relationship?: string;
}

export class BankDetailsCreateDto {
    @ApiPropertyOptional({ example: 'Chase Bank' })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiPropertyOptional({ example: '1234567890' })
    @IsOptional()
    @IsString()
    accountNumber?: string;

    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    accountName?: string;
}

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

    @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
    @IsOptional()
    @IsString()
    profileImage?: string | null;

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

    @ApiPropertyOptional({
        example: 'FULL_TIME',
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
    })
    @IsOptional()
    @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
    employmentType?: string;

    @ApiPropertyOptional({
        example: 'ACTIVE',
        enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'],
    })
    @IsOptional()
    @IsIn(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'])
    status?: string;

    @ApiPropertyOptional({ example: 50000.0 })
    @IsOptional()
    @IsNumber()
    salary?: number;

    @ApiPropertyOptional({ type: EmergencyContactCreateDto })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => EmergencyContactCreateDto)
    emergencyContact?: EmergencyContactCreateDto;

    @ApiPropertyOptional({ type: BankDetailsCreateDto })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => BankDetailsCreateDto)
    bankDetails?: BankDetailsCreateDto;

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

    // @ApiProperty({ example: 'uuid-role' })
    // @IsNotEmpty()
    // @IsString()
    // roleId: string;

    @ApiProperty({ example: 'employee' })
    @IsNotEmpty()
    @IsString()
    @IsIn(['employee', 'hr'])
    roleName: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsIn,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import {
    EmergencyContactCreateDto,
    BankDetailsCreateDto,
} from './employee-create.dto';

export class EmployeeUpdateDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    firstname?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    lastname?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    profileImage?: string | null;

    @ApiProperty({ required: false })
    @IsOptional()
    gender?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Date)
    dob?: Date;

    @ApiProperty({ required: false })
    @IsOptional()
    address?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    phone?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    hireDate?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    departmentId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    positionId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
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
}

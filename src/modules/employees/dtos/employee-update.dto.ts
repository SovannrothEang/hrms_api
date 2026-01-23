import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

// Omit user account details as they updated separately or not at all here
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
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import {
  EmergencyContactCreateDto,
  BankDetailsCreateDto,
} from '../../employees/dtos/employee-create.dto';

export class MeProfileUpdateDto {
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

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RoleUpdateDto {
  @ApiProperty({ name: 'name', description: 'New name of the role' })
  @IsNotEmpty()
  @IsString()
  name: string;
}

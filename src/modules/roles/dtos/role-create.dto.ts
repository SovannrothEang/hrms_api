import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RoleCreateDto {
  @ApiProperty({ example: 'EMPLOYEE' })
  @IsNotEmpty()
  @IsString()
  roleName: string;
}

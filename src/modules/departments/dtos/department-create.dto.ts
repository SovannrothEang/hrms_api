import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DepartmentCreateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    @ApiProperty({
        name: 'name',
        example: "Department's name",
    })
    name: string;
}

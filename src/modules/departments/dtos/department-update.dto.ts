import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class DepartmentUpdateDto {
    @IsString()
    @MaxLength(150)
    @ApiProperty({
        name: 'name',
        example: "Department's name",
        required: false,
    })
    name?: string;
}

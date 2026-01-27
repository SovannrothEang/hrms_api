import { ApiProperty } from '@nestjs/swagger';

export class DepartmentDistributionItemDto {
    @ApiProperty({ example: 'dept-uuid-123', description: 'Department ID' })
    id: string;

    @ApiProperty({ example: 'Engineering', description: 'Department name' })
    name: string;

    @ApiProperty({
        example: 50,
        description: 'Number of employees in department',
    })
    employeeCount: number;

    @ApiProperty({
        example: 33.33,
        description: 'Percentage of total employees',
    })
    percentage: number;
}

export class DepartmentDistributionDto {
    @ApiProperty({ type: [DepartmentDistributionItemDto] })
    departments: DepartmentDistributionItemDto[];

    @ApiProperty({ example: 150, description: 'Total number of employees' })
    totalEmployees: number;
}

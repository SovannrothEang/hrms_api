import { Department, Employee, User } from '@prisma/client';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { EmployeeDto } from 'src/modules/employees/dtos/employee.dto';
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';

export class DepartmentDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'department_name' })
    @Transform(({ obj }) => obj.departmentName)
    name: string;

    @Expose({ name: 'employees' })
    @Transform(({ obj }: { obj: Department & { employees?: Employee[] } }) => {
        if (!Array.isArray(obj.employees)) return [];
        return obj.employees.map((e: Employee) =>
            plainToInstance(EmployeeDto, e),
        );
    })
    employees: EmployeeDto[];

    @Expose({ name: 'performer' })
    @Transform(({ obj }: { obj: Department & { performer?: User | null } }) => {
        if (!obj.performer) return null;
        return plainToInstance(UserDto, obj.performer);
    })
    performer: UserDto;

    @Expose({ name: 'is_active' })
    isActive: boolean;

    @Expose({ name: 'created_at' })
    createdAt: Date;

    @Expose({ name: 'updated_at' })
    updatedAt: Date;
}

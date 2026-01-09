import { Exclude, Expose, plainToInstance, Transform } from 'class-transformer';
import { EmployeeDto } from '../../../employees/dtos/employee.dto';
import { Employee, Role, User, UserRole } from '@prisma/client';

@Exclude()
export class UserDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'username' })
    username: string;

    @Expose({ name: 'email' })
    email: string;

    @Expose()
    @Transform(
        ({
            obj,
        }: {
            obj: User & { userRoles: (UserRole & { role: Role })[] };
        }) => {
            if (!Array.isArray(obj.userRoles)) return [];
            return obj.userRoles.map((ur) => ur.role.name);
        },
    )
    roles: string[];

    @Expose()
    @Transform(({ obj }: { obj: User & { employee: Employee | null } }) => {
        if (!obj.employee) return null;
        return plainToInstance(EmployeeDto, obj.employee);
    })
    employees: EmployeeDto;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

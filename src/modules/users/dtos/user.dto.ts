import { Exclude, Expose, plainToInstance, Transform } from 'class-transformer';
import { EmployeeDto } from '../../employees/dtos/employee.dto';

@Exclude()
export class UserDto {
  @Expose({ name: 'id' })
  id: string;

  @Expose({ name: 'username' })
  username: string;

  @Expose({ name: 'email' })
  email: string;

  @Expose()
  @Transform(({ obj }) => {
    if (!Array.isArray(obj.userRoles)) return [];
    return obj.userRoles.map((ur) => ur.role.name);
  })
  roles: string[];

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.employee) return null;
    return plainToInstance(EmployeeDto, obj.employee);

  })
  employees: EmployeeDto;

  @Expose({ name: 'createdAt' })
  createdAt: Date;

  @Expose({ name: 'updatedAt' })
  updatedAt: Date;
}

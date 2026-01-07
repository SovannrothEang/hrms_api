import {
    Exclude,
    Expose,
    plainToInstance,
    Transform,
    Type,
} from 'class-transformer';
import { UserDto } from '../../users/dtos/user.dto';
import { EmployeeDto } from '../../employees/dtos/employee.dto';
import { Attendance, Employee, User } from '@prisma/client';

@Exclude()
export class AttendanceDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'employeeId' })
    employeeId: string;

    @Expose({ name: 'status' })
    status: string;

    @Expose({ name: 'date' })
    date: Date;

    @Expose({ name: 'checkInTime' })
    checkInTime: Date;

    @Expose({ name: 'checkOutTime' })
    checkOutTime: Date;

    @Expose({ name: 'perform_by' })
    performBy: string;

    @Expose({ name: 'performer' })
    @Type(() => UserDto)
    @Transform(({ obj }: { obj: Attendance & { performer?: User | null } }) => {
        if (!obj.performer) return null;
        return plainToInstance(UserDto, obj.performer);
    })
    performer: UserDto;

    @Expose({ name: 'employee' })
    @Type(() => EmployeeDto)
    @Transform(({ obj }: { obj: Attendance & { employee?: Employee | null } }) => {
        if (!obj.employee) return null;
        return plainToInstance(EmployeeDto, obj.employee);
    })
    employee: EmployeeDto;

    @Expose({ name: 'isActive' })
    isActive: boolean;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

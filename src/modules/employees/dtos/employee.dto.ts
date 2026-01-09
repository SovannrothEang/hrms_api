import { Exclude, Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { Department, Employee, EmployeePosition } from '@prisma/client';
import { DepartmentDto } from '../../departments/dtos/department.dto';
import { EmployeePositionDto } from '../../employee-positions/dtos/employee-position.dto';

@Exclude()
export class EmployeeDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'employee_code' })
    code: string;

    @Expose({ name: 'firstname' })
    firstname: string;

    @Expose({ name: 'lastname' })
    lastname: string;

    @Expose({ name: 'gender' })
    @Transform(({ obj }: { obj: Employee }) => {
        switch (obj.gender) {
            case 0:
                return 'male';
            case 1:
                return 'female';
            default:
                return 'unknown';
        }
    })
    gender: string;

    @Expose({ name: 'dob' })
    @Transform(({ obj }: { obj: Employee }) => {
        return obj.dob.toISOString().split('T')[0];
    })
    dateOfBirth: string;

    @Expose({ name: 'address' })
    address: string;

    @Expose({ name: 'phone' })
    phoneNumber: string;

    @Expose({ name: 'hire_date' })
    hireDate: Date;

    @Expose({ name: 'position' })
    @Type(() => EmployeePositionDto)
    position: EmployeePositionDto;

    @Expose({ name: 'department' })
    @Type(() => DepartmentDto)
    department: DepartmentDto;

    @Expose({ name: 'isActive' })
    isActive: boolean;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

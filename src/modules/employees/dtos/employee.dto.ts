import {
    Exclude,
    Expose,
    plainToInstance,
    Transform,
    Type,
} from 'class-transformer';
import { Employee, User, Prisma } from '@prisma/client';
import { DepartmentDto } from '../../departments/dtos/department.dto';
import { EmployeePositionDto } from '../../employee-positions/dtos/employee-position.dto';
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';

export class EmergencyContactDto {
    name?: string;
    phone?: string;
    relationship?: string;
}

export class BankDetailsDto {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
}

@Exclude()
export class EmployeeDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'employeeCode' })
    employeeCode: string;

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

    @Expose({ name: 'user_id' })
    userId: string;

    @Expose({ name: 'user' })
    @Transform(({ value }: { value: User }) => {
        if (!value) return null;
        return plainToInstance(UserDto, value);
    })
    user: UserDto;

    @Expose({ name: 'address' })
    address: string;

    @Expose({ name: 'phone' })
    phoneNumber: string;

    @Expose({ name: 'profile_image' })
    profileImage: string | null;

    @Expose({ name: 'hire_date' })
    hireDate: Date;

    @Expose({ name: 'position_id' })
    positionId: string;

    @Expose({ name: 'position' })
    @Type(() => EmployeePositionDto)
    position: EmployeePositionDto;

    @Expose({ name: 'department_id' })
    departmentId: string;

    @Expose({ name: 'department' })
    @Type(() => DepartmentDto)
    department: DepartmentDto;

    @Expose({ name: 'employmentType' })
    employmentType: string;

    @Expose({ name: 'status' })
    status: string;

    @Expose({ name: 'salary' })
    @Transform(({ value }: { value: Prisma.Decimal | null }) => {
        if (!value) return null;
        return Number(value);
    })
    salary: number | null;

    @Expose({ name: 'emergencyContact' })
    emergencyContact: EmergencyContactDto | null;

    @Expose({ name: 'bankDetails' })
    bankDetails: BankDetailsDto | null;

    @Expose({ name: 'isActive' })
    isActive: boolean;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

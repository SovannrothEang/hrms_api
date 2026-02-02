import {
    Exclude,
    Expose,
    plainToInstance,
    Transform,
    Type,
} from 'class-transformer';
import { Employee, User } from '@prisma/client';
import { DepartmentDto } from '../../departments/dtos/department.dto';
import { EmployeePositionDto } from '../../employee-positions/dtos/employee-position.dto';
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';
import { DecimalNumber } from 'src/config/decimal-number';
import { Decimal } from '@prisma/client/runtime/client';

const toDecimal = ({
    value,
}: {
    value: string | number | Decimal | null | undefined;
}) => {
    if (value === null || value === undefined) return null;
    return new DecimalNumber(value);
};

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

    @Expose({ name: 'userId' })
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

    @Expose({ name: 'profileImage' })
    profileImage: string | null;

    @Expose({ name: 'hireDate' })
    hireDate: Date;

    @Expose({ name: 'positionId' })
    positionId: string;

    @Expose({ name: 'position' })
    @Type(() => EmployeePositionDto)
    position: EmployeePositionDto;

    @Expose({ name: 'departmentId' })
    departmentId: string;

    @Expose({ name: 'department' })
    @Type(() => DepartmentDto)
    department: DepartmentDto;

    @Expose({ name: 'employmentType' })
    employmentType: string;

    @Expose({ name: 'status' })
    status: string;

    @Expose({ name: 'salary' })
    @Type(() => DecimalNumber)
    @Transform(toDecimal)
    salary: DecimalNumber | null;

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

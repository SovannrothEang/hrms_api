import {
    Exclude,
    Expose,
    Transform,
    plainToInstance,
    Type,
} from 'class-transformer';
import { EmployeeDto } from '../../employees/dtos/employee.dto';
import { Employee, LeaveRequest, User } from '@prisma/client';
import { UserDto } from '../../iam/users/dtos/user.dto';

@Exclude()
export class LeaveRequestDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'employeeId' })
    employeeId: string;

    @Expose({ name: 'approvedBy' })
    approvedBy: string | null;

    @Expose({ name: 'startDate' })
    startDate: Date;

    @Expose({ name: 'endDate' })
    endDate: Date;

    @Expose({ name: 'leaveType' })
    leaveType: string;

    @Expose({ name: 'status' })
    status: string;

    @Expose({ name: 'requestDate' })
    requestDate: Date;

    @Expose({ name: 'reason' })
    reason: string | null;

    @Expose({ name: 'employee' })
    @Type(() => EmployeeDto)
    @Transform(
        ({ obj }: { obj: LeaveRequest & { requester?: Employee | null } }) => {
            if (!obj.requester) return null;
            return plainToInstance(EmployeeDto, obj.requester);
        },
    )
    employee: EmployeeDto;

    @Expose({ name: 'approver' })
    @Type(() => EmployeeDto)
    @Transform(
        ({ obj }: { obj: LeaveRequest & { approver?: Employee | null } }) => {
            if (!obj.approver) return null;
            return plainToInstance(EmployeeDto, obj.approver);
        },
    )
    approver: EmployeeDto;

    @Expose({ name: 'perform_by' })
    performBy: string;

    @Expose({ name: 'performer' })
    @Type(() => UserDto)
    @Transform(
        ({ obj }: { obj: LeaveRequest & { performer?: User | null } }) => {
            if (!obj.performer) return null;
            return plainToInstance(UserDto, obj.performer);
        },
    )
    performer: UserDto;

    @Expose({ name: 'isActive' })
    isActive: boolean;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

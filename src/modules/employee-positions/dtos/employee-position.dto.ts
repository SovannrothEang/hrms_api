import {
    Exclude,
    Expose,
    plainToInstance,
    Transform,
    Type,
} from 'class-transformer';
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';
import { EmployeePosition, User } from '@prisma/client';
import { EmployeeDto } from 'src/modules/employees/dtos/employee.dto';
import { DecimalNumber } from '../../../config/decimal-number';
import { Decimal } from '@prisma/client/runtime/client';

const toDecimal = ({
    value,
}: {
    value: string | number | Decimal | null | undefined;
}) => {
    if (value === null || value === undefined) return null;
    return new DecimalNumber(value);
};

@Exclude()
export class EmployeePositionDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'title' })
    title: string;

    @Expose({ name: 'description' })
    description: string;

    @Expose()
    @Type(() => DecimalNumber)
    @Transform(toDecimal)
    salaryRangeMin: DecimalNumber;

    @Expose()
    @Type(() => DecimalNumber)
    @Transform(toDecimal)
    salaryRangeMax: DecimalNumber;

    @Expose({ name: 'perform_by' })
    performBy: string;

    @Expose({ name: 'performer' })
    @Transform(
        ({ obj }: { obj: EmployeePosition & { performer?: User | null } }) => {
            if (!obj.performer) return null;
            return plainToInstance(UserDto, obj.performer);
        },
    )
    performer: UserDto;

    @Expose({ name: 'employees' })
    @Type(() => EmployeeDto)
    employees: EmployeeDto[];

    @Expose({ name: 'is_active' })
    isActive: boolean;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

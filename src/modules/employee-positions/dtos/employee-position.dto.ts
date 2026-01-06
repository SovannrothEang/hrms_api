import { Expose, plainToInstance, Transform } from 'class-transformer';
import { UserDto } from 'src/modules/users/dtos/user.dto';
import { EmployeePosition, User } from '@prisma/client';

export class EmployeePositionDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'title' })
    title: string;

    @Expose({ name: 'description' })
    description: string;

    @Expose({ name: 'salary_range_min' })
    salaryRangeMin: number;

    @Expose({ name: 'salary_range_max' })
    salaryRangeMax: number;

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

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

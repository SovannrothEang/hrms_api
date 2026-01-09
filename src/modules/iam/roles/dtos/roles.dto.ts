import { Exclude, Expose, plainToInstance, Transform } from 'class-transformer';
import { UserDto } from 'src/modules/iam/users/dtos/user.dto';
import { Role, User } from '@prisma/client';

@Exclude()
export class RoleDto {
    @Expose({ name: 'id' })
    id: string;

    @Expose({ name: 'name' })
    name: string;

    @Expose({ name: 'performer' })
    @Transform(({ obj }: { obj: Role & { performer?: User | null } }) => {
        if (!obj.performer) return null;

        return plainToInstance(UserDto, obj.performer);
    })
    performer: UserDto;

    @Expose({ name: 'createdAt' })
    createdAt: Date;

    @Expose({ name: 'updatedAt' })
    updatedAt: Date | null;
}

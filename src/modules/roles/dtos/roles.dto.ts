import { Exclude, Expose, plainToInstance, Transform } from 'class-transformer';
import { UserDto } from 'src/modules/users/dtos/user.dto';

@Exclude()
export class RoleDto {
  @Expose({ name: 'id' })
  id: string;

  @Expose({ name: 'name' })
  name: string;

  @Expose({ name: 'performer' })
  @Transform(({ obj }) => {
    if (!obj.performer) return null;

    return plainToInstance(UserDto, obj.performer);
  })
  performer: UserDto

  @Expose({ name: 'createdAt' })
  createdAt: Date;

  @Expose({ name: 'updatedAt' })
  updatedAt: Date;
}

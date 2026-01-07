import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../enums/roles.enum';

// export const Auth = (...args: string[]) => SetMetadata('auth', args);
export const ROLE_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLE_KEY, roles);

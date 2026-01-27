import {
    applyDecorators,
    UseGuards,
    SetMetadata,
    CanActivate,
    Type,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { RoleName } from '../enums/roles.enum';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CsrfGuard, SKIP_CSRF_KEY } from '../security/guards/csrf.guard';
import { SessionGuard } from '../security/guards/session.guard';

export interface AuthOptions {
    roles?: RoleName[];
    csrf?: boolean;
    session?: boolean;
}

export function Auth(
    rolesOrOptions?: RoleName[] | AuthOptions | RoleName,
    ...restRoles: RoleName[]
) {
    let roles: RoleName[] = [];
    let enableCsrf = false;
    let enableSession = false;

    if (Array.isArray(rolesOrOptions)) {
        roles = rolesOrOptions;
    } else if (typeof rolesOrOptions === 'object' && rolesOrOptions !== null) {
        roles = rolesOrOptions.roles || [];
        enableCsrf = rolesOrOptions.csrf ?? false;
        enableSession = rolesOrOptions.session ?? false;
    } else if (typeof rolesOrOptions === 'string') {
        roles = [rolesOrOptions, ...restRoles];
    }

    const guards: Type<CanActivate>[] = [JwtAuthGuard, RolesGuard];

    if (enableSession) {
        guards.push(SessionGuard);
    }

    if (enableCsrf) {
        guards.push(CsrfGuard);
    }

    const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] =
        [
            UseGuards(...guards),
            ApiBearerAuth(),
            ApiResponse({ status: 401, description: 'Unauthorized' }),
        ];

    if (!enableCsrf) {
        decorators.push(SetMetadata(SKIP_CSRF_KEY, true));
    }

    if (enableCsrf) {
        decorators.push(
            ApiHeader({
                name: 'x-csrf-token',
                description: 'CSRF token for state-changing requests',
                required: true,
            }),
        );
    }

    if (roles.length > 0) {
        decorators.push(Roles(...roles));
        decorators.push(ApiResponse({ status: 403, description: 'Forbidden' }));
    }

    return applyDecorators(...decorators);
}

export function AuthWithCsrf(...roles: RoleName[]) {
    return Auth({ roles, csrf: true, session: true });
}

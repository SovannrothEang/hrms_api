import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../enums/roles.enum';
import { ROLE_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflect: Reflector) {}

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const requiredRole = this.reflect.getAllAndOverride<RoleName[]>(
            ROLE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRole) return true;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { user } = context.switchToHttp().getRequest();
        if (!user) return false;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return requiredRole.some((role) => user.roles?.includes(role));
    }
}

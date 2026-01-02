import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../enums/roles.enum';
import { ROLE_KEY } from '../../modules/roles/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflect: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRole = this.reflect.getAllAndOverride<RoleName[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRole.some((role) => user.roles.includes(role));
  }
}

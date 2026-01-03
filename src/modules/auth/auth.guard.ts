import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  UserContext,
  UserContextService,
} from '../../utils/user-context.service';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userContext: UserContextService,
    private readonly authService: AuthService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) throw new UnauthorizedException();
    const payload = this.authService.validateToken(token);

    this.userContext.setUser({
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
    });

    return true;
  }
}

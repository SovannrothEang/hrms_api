import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'superSecretKey',
    });
  }

  async validate(payload: any) {
    // This payload is the decoded JWT.
    // We return what we want injected into `request.user`
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}

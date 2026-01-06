import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from 'src/common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'superSecretKey',
        });
    }

    validate(payload: UserPayload) {
        // This payload is the decoded JWT.
        // We return what we want injected into `request.user`
        return { sub: payload.sub, email: payload.email, roles: payload.roles };
    }
}

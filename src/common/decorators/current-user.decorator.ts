import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface UserPayload {
    sub: string;
    email: string;
    roles: string[];
}

interface RequestWithUser extends Request {
    user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
    (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        const user = request.user;

        if (!user) {
            throw new UnauthorizedException();
        }

        return data ? user?.[data] : user;
    },
);

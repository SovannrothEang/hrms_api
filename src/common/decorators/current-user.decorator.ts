import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { UserContext } from "src/modules/auth/user-context.service";

export const CurrentUser = createParamDecorator(
    (data: keyof UserContext | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new UnauthorizedException();
        }

        return data ? user?.[data] : user;
    }
)
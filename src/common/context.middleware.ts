import { Injectable, NestMiddleware } from '@nestjs/common';
import { UserContextService } from '../modules/auth/user-context.service';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
    constructor(private readonly userContext: UserContextService) {}
    use(req: any, res: any, next: () => void) {
        this.userContext.run(
            {
                id: '',
                email: '',
                roles: [],
            },
            () => {
                next();
            },
        );
    }
}

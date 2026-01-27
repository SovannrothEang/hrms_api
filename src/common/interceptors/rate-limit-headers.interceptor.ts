import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response as ExpressResponse } from 'express';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
    private readonly limit = 10;
    private readonly ttlSeconds = 60;

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const response = context.switchToHttp().getResponse<ExpressResponse>();

        const reset = Math.ceil(Date.now() / 1000) + this.ttlSeconds;

        response.setHeader('X-RateLimit-Limit', this.limit.toString());
        response.setHeader('X-RateLimit-Reset', reset.toString());

        return next.handle();
    }
}

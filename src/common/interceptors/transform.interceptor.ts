import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface Response<T> {
    data: T;
    statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
    T,
    Response<T>
> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => ({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                data,

                statusCode: context
                    .switchToHttp()
                    .getResponse<ExpressResponse>().statusCode,
            })),
        );
    }
}

import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF_KEY } from '../guards/csrf.guard';
import { SKIP_SESSION_KEY } from '../guards/session.guard';

export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

export const SkipSession = () => SetMetadata(SKIP_SESSION_KEY, true);

export const PublicEndpoint = () => {
    return (
        target: object,
        propertyKey?: string | symbol,
        descriptor?: TypedPropertyDescriptor<unknown>,
    ) => {
        SetMetadata(SKIP_CSRF_KEY, true)(target, propertyKey!, descriptor!);
        SetMetadata(SKIP_SESSION_KEY, true)(target, propertyKey!, descriptor!);
    };
};

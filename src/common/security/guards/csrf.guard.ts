import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfService } from '../services/csrf.service';
import { SecurityEventService } from '../services/security-event.service';
import {
    SECURITY_CONFIG,
    SECURITY_HEADERS,
    COOKIE_NAMES,
} from '../constants/security.constants';
import { RequestWithSecurity } from '../interfaces/security.interfaces';

export const SKIP_CSRF_KEY = 'skipCsrf';

@Injectable()
export class CsrfGuard implements CanActivate {
    private readonly logger = new Logger(CsrfGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly csrfService: CsrfService,
        private readonly securityEventService: SecurityEventService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (!SECURITY_CONFIG.csrf.enabled) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<RequestWithSecurity>();
        const method = request.method.toUpperCase();

        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            return true;
        }

        const skipCsrf = this.reflector.getAllAndOverride<boolean>(
            SKIP_CSRF_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipCsrf) {
            return true;
        }

        if (this.csrfService.isPathExcluded(request.path)) {
            return true;
        }

        const sessionId: string | undefined =
            (request.cookies?.[COOKIE_NAMES.SESSION_ID] as
                | string
                | undefined) ||
            (request.headers[SECURITY_HEADERS.SESSION_ID] as
                | string
                | undefined);

        const csrfToken: string | undefined =
            (request.headers[SECURITY_HEADERS.CSRF_TOKEN] as
                | string
                | undefined) ||
            ((request.body as Record<string, unknown>)?._csrf as
                | string
                | undefined);

        if (!sessionId) {
            await this.logCsrfFailure(request, 'Missing session ID');
            throw new ForbiddenException(
                'Missing session ID for CSRF validation',
            );
        }

        if (!csrfToken) {
            await this.logCsrfFailure(request, 'Missing CSRF token');
            throw new ForbiddenException('Missing CSRF token');
        }

        const validation = this.csrfService.validateToken(sessionId, csrfToken);

        if (!validation.valid) {
            await this.logCsrfFailure(
                request,
                validation.reason || 'Invalid CSRF token',
            );
            throw new ForbiddenException(
                validation.reason || 'Invalid CSRF token',
            );
        }

        return true;
    }

    private async logCsrfFailure(
        request: RequestWithSecurity,
        reason: string,
    ): Promise<void> {
        const ip = this.getClientIp(request);
        const userAgent = request.headers['user-agent'] || 'Unknown';

        this.logger.warn(`CSRF validation failed: ${reason}`, {
            path: request.path,
            method: request.method,
            ip,
        });

        await this.securityEventService.logCsrfValidationFailed(
            ip,
            userAgent,
            request.path,
        );
    }

    private getClientIp(request: RequestWithSecurity): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        return request.ip || request.socket?.remoteAddress || 'Unknown';
    }
}

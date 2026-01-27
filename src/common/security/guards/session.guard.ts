import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../services/session.service';
import { SecurityEventService } from '../services/security-event.service';
import {
    COOKIE_NAMES,
    SECURITY_HEADERS,
} from '../constants/security.constants';
import { RequestWithSecurity } from '../interfaces/security.interfaces';

export const SKIP_SESSION_KEY = 'skipSession';

@Injectable()
export class SessionGuard implements CanActivate {
    private readonly logger = new Logger(SessionGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly sessionService: SessionService,
        private readonly securityEventService: SecurityEventService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<RequestWithSecurity>();

        const skipSession = this.reflector.getAllAndOverride<boolean>(
            SKIP_SESSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipSession) {
            return true;
        }

        const sessionId: string | undefined =
            (request.cookies?.[COOKIE_NAMES.SESSION_ID] as
                | string
                | undefined) ||
            (request.headers[SECURITY_HEADERS.SESSION_ID] as
                | string
                | undefined);

        if (!sessionId) {
            this.logger.debug('No session ID provided');
            return true;
        }

        const ip = this.getClientIp(request);
        const validation = await this.sessionService.validateSession(
            sessionId,
            ip,
        );

        if (!validation.valid) {
            const userAgent = request.headers['user-agent'] || 'Unknown';

            this.logger.warn(
                `Session validation failed: ${validation.reason}`,
                {
                    sessionId: sessionId.substring(0, 8),
                    ip,
                },
            );

            if (validation.reason === 'IP address mismatch') {
                await this.securityEventService.logEvent('IP_MISMATCH', {
                    sessionId,
                    ip,
                    userAgent,
                    severity: 'WARNING',
                    details: { reason: validation.reason },
                });
            }

            throw new UnauthorizedException(
                validation.reason || 'Invalid session',
            );
        }

        request.sessionId = sessionId;
        request.securityContext = {
            ip,
            userAgent: request.headers['user-agent'] || 'Unknown',
            sessionId,
        };

        return true;
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

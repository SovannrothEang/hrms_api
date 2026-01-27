import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
    SecurityEventData,
    SecurityEventType,
    SecuritySeverity,
} from '../interfaces/security.interfaces';
import { PrismaService } from 'src/common/services/prisma/prisma.service';

@Injectable()
export class SecurityEventService {
    private readonly logger = new Logger(SecurityEventService.name);
    private readonly eventBuffer: SecurityEventData[] = [];
    private readonly maxBufferSize = 100;

    constructor(private readonly prisma: PrismaService) {}

    async logEvent(
        eventType: SecurityEventType,
        options: {
            userId?: string;
            sessionId?: string;
            ip: string;
            userAgent: string;
            severity?: SecuritySeverity;
            details?: Record<string, unknown>;
        },
    ): Promise<SecurityEventData> {
        const severity = options.severity || this.determineSeverity(eventType);

        const event: SecurityEventData = {
            id: uuidv4(),
            eventType,
            userId: options.userId,
            sessionId: options.sessionId,
            ip: options.ip,
            userAgent: this.sanitizeUserAgent(options.userAgent),
            severity,
            details: options.details,
            timestamp: new Date(),
        };

        this.eventBuffer.push(event);

        this.logToConsole(event);

        if (severity === 'HIGH' || severity === 'CRITICAL') {
            await this.handleHighSeverityEvent(event);
        }

        if (this.eventBuffer.length >= this.maxBufferSize) {
            this.flushBuffer();
        }

        return event;
    }

    async logLoginSuccess(
        userId: string,
        ip: string,
        userAgent: string,
    ): Promise<void> {
        await this.logEvent('LOGIN_SUCCESS', {
            userId,
            ip,
            userAgent,
            severity: 'INFO',
        });
    }

    async logLoginFailed(
        email: string,
        ip: string,
        userAgent: string,
        reason?: string,
    ): Promise<void> {
        await this.logEvent('LOGIN_FAILED', {
            ip,
            userAgent,
            severity: 'WARNING',
            details: { email, reason },
        });
    }

    async logLogout(
        userId: string,
        sessionId: string,
        ip: string,
        userAgent: string,
    ): Promise<void> {
        await this.logEvent('LOGOUT', {
            userId,
            sessionId,
            ip,
            userAgent,
            severity: 'INFO',
        });
    }

    async logAccountLocked(
        userId: string,
        ip: string,
        userAgent: string,
        reason: string,
    ): Promise<void> {
        await this.logEvent('ACCOUNT_LOCKED', {
            userId,
            ip,
            userAgent,
            severity: 'HIGH',
            details: { reason },
        });
    }

    async logCsrfValidationFailed(
        ip: string,
        userAgent: string,
        path: string,
    ): Promise<void> {
        await this.logEvent('CSRF_VALIDATION_FAILED', {
            ip,
            userAgent,
            severity: 'HIGH',
            details: { path },
        });
    }

    async logSuspiciousActivity(
        userId: string | undefined,
        ip: string,
        userAgent: string,
        reason: string,
        details?: Record<string, unknown>,
    ): Promise<void> {
        await this.logEvent('SUSPICIOUS_ACTIVITY', {
            userId,
            ip,
            userAgent,
            severity: 'CRITICAL',
            details: { reason, ...details },
        });
    }

    async logUnauthorizedAccess(
        userId: string | undefined,
        ip: string,
        userAgent: string,
        resource: string,
    ): Promise<void> {
        await this.logEvent('UNAUTHORIZED_ACCESS', {
            userId,
            ip,
            userAgent,
            severity: 'HIGH',
            details: { resource },
        });
    }

    getRecentEvents(
        limit: number = 50,
        filters?: {
            userId?: string;
            eventType?: SecurityEventType;
            severity?: SecuritySeverity;
            startDate?: Date;
            endDate?: Date;
        },
    ): SecurityEventData[] {
        let events = [...this.eventBuffer];

        if (filters) {
            if (filters.userId) {
                events = events.filter((e) => e.userId === filters.userId);
            }
            if (filters.eventType) {
                events = events.filter(
                    (e) => e.eventType === filters.eventType,
                );
            }
            if (filters.severity) {
                events = events.filter((e) => e.severity === filters.severity);
            }
            if (filters.startDate) {
                events = events.filter(
                    (e) => e.timestamp >= filters.startDate!,
                );
            }
            if (filters.endDate) {
                events = events.filter((e) => e.timestamp <= filters.endDate!);
            }
        }

        return events
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    getFailedLoginAttempts(ip: string, windowMs: number): number {
        const cutoff = new Date(Date.now() - windowMs);
        const events = this.eventBuffer.filter(
            (e) =>
                e.eventType === 'LOGIN_FAILED' &&
                e.ip === ip &&
                e.timestamp >= cutoff,
        );
        return events.length;
    }

    getUserEventCount(
        userId: string,
        eventType: SecurityEventType,
        windowMs: number,
    ): number {
        const cutoff = new Date(Date.now() - windowMs);
        const events = this.eventBuffer.filter(
            (e) =>
                e.userId === userId &&
                e.eventType === eventType &&
                e.timestamp >= cutoff,
        );
        return events.length;
    }

    private determineSeverity(eventType: SecurityEventType): SecuritySeverity {
        const severityMap: Record<SecurityEventType, SecuritySeverity> = {
            LOGIN_SUCCESS: 'INFO',
            LOGIN_FAILED: 'WARNING',
            LOGOUT: 'INFO',
            TOKEN_REFRESH: 'INFO',
            PASSWORD_CHANGE: 'INFO',
            PASSWORD_RESET_REQUEST: 'INFO',
            PASSWORD_RESET_SUCCESS: 'INFO',
            ACCOUNT_LOCKED: 'HIGH',
            ACCOUNT_UNLOCKED: 'INFO',
            SESSION_CREATED: 'INFO',
            SESSION_INVALIDATED: 'INFO',
            SESSION_EXPIRED: 'INFO',
            CSRF_VALIDATION_FAILED: 'HIGH',
            RATE_LIMIT_EXCEEDED: 'WARNING',
            UNAUTHORIZED_ACCESS: 'HIGH',
            SUSPICIOUS_ACTIVITY: 'CRITICAL',
            IP_MISMATCH: 'WARNING',
            MULTIPLE_FAILED_ATTEMPTS: 'HIGH',
        };

        return severityMap[eventType] || 'INFO';
    }

    private async handleHighSeverityEvent(
        event: SecurityEventData,
    ): Promise<void> {
        this.logger.warn(`HIGH SEVERITY SECURITY EVENT: ${event.eventType}`, {
            eventId: event.id,
            userId: event.userId,
            ip: event.ip,
            severity: event.severity,
            details: event.details,
        });

        try {
            await this.prisma.client.auditLog.create({
                data: {
                    id: event.id,
                    userId: event.userId,
                    action: `SECURITY_${event.eventType}`,
                    tableName: 'security_events',
                    recordId: event.sessionId || event.id,
                    newValue: event.details
                        ? (JSON.parse(JSON.stringify(event.details)) as Record<
                              string,
                              unknown
                          >)
                        : undefined,
                    timestamp: event.timestamp,
                },
            });
        } catch (error) {
            this.logger.error(
                'Failed to persist security event to audit log',
                error,
            );
        }
    }

    private logToConsole(event: SecurityEventData): void {
        const logMethod =
            event.severity === 'CRITICAL' || event.severity === 'HIGH'
                ? 'warn'
                : 'log';

        this.logger[logMethod](
            `Security Event: ${event.eventType} | Severity: ${event.severity} | IP: ${event.ip}`,
            {
                eventId: event.id,
                userId: event.userId?.substring(0, 8),
            },
        );
    }

    private sanitizeUserAgent(userAgent: string): string {
        if (!userAgent) return 'Unknown';
        return userAgent.substring(0, 256);
    }

    private flushBuffer(): void {
        const eventsToFlush = this.eventBuffer.splice(
            0,
            Math.floor(this.maxBufferSize / 2),
        );

        this.logger.debug(
            `Flushed ${eventsToFlush.length} security events from buffer`,
        );
    }
}

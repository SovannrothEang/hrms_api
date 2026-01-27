import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
    SessionData,
    SessionValidationResult,
} from '../interfaces/security.interfaces';
import { SECURITY_CONFIG } from '../constants/security.constants';
import { PrismaService } from 'src/common/services/prisma/prisma.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);
    private readonly sessionStore = new Map<string, SessionData>();

    constructor(private readonly prisma: PrismaService) {}

    createSession(userId: string, ip: string, userAgent: string): SessionData {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(
            now.getTime() + SECURITY_CONFIG.session.sessionTtl,
        );

        const sessionData: SessionData = {
            id: sessionId,
            userId,
            ip,
            userAgent: this.sanitizeUserAgent(userAgent),
            createdAt: now,
            lastAccessedAt: now,
            expiresAt,
            isValid: true,
        };

        this.sessionStore.set(sessionId, sessionData);

        this.enforceMaxSessions(userId);

        this.logger.log(
            `Session created for user: ${userId.substring(0, 8)}..., IP: ${ip}`,
        );

        return sessionData;
    }

    validateSession(sessionId: string, ip?: string): SessionValidationResult {
        if (!sessionId) {
            return { valid: false, reason: 'No session ID provided' };
        }

        const session = this.sessionStore.get(sessionId);

        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        if (!session.isValid) {
            return { valid: false, reason: 'Session has been invalidated' };
        }

        const now = new Date();
        if (now > session.expiresAt) {
            this.sessionStore.delete(sessionId);
            this.logger.warn(
                `Session expired: ${sessionId.substring(0, 8)}...`,
            );
            return { valid: false, reason: 'Session expired' };
        }

        if (SECURITY_CONFIG.session.validateIp && ip && session.ip !== ip) {
            this.logger.warn(
                `IP mismatch for session: ${sessionId.substring(0, 8)}..., expected: ${session.ip}, got: ${ip}`,
            );
            return { valid: false, reason: 'IP address mismatch' };
        }

        session.lastAccessedAt = now;
        this.sessionStore.set(sessionId, session);

        return { valid: true, session };
    }

    invalidateSession(sessionId: string): void {
        const session = this.sessionStore.get(sessionId);
        if (session) {
            session.isValid = false;
            this.sessionStore.delete(sessionId);
            this.logger.log(
                `Session invalidated: ${sessionId.substring(0, 8)}...`,
            );
        }
    }

    invalidateAllUserSessions(userId: string): number {
        let count = 0;
        for (const [sessionId, session] of this.sessionStore.entries()) {
            if (session.userId === userId) {
                session.isValid = false;
                this.sessionStore.delete(sessionId);
                count++;
            }
        }
        this.logger.log(
            `Invalidated ${count} sessions for user: ${userId.substring(0, 8)}...`,
        );
        return count;
    }

    getUserSessions(userId: string): SessionData[] {
        const sessions: SessionData[] = [];
        for (const session of this.sessionStore.values()) {
            if (session.userId === userId && session.isValid) {
                sessions.push(session);
            }
        }
        return sessions.sort(
            (a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime(),
        );
    }

    getSession(sessionId: string): SessionData | undefined {
        return this.sessionStore.get(sessionId);
    }

    refreshSession(sessionId: string): SessionData | null {
        const session = this.sessionStore.get(sessionId);
        if (!session || !session.isValid) {
            return null;
        }

        const now = new Date();
        session.lastAccessedAt = now;
        session.expiresAt = new Date(
            now.getTime() + SECURITY_CONFIG.session.sessionTtl,
        );
        this.sessionStore.set(sessionId, session);

        return session;
    }

    private enforceMaxSessions(userId: string): void {
        const userSessions = this.getUserSessions(userId);

        if (userSessions.length > SECURITY_CONFIG.session.maxSessionsPerUser) {
            const sessionsToRemove = userSessions
                .sort(
                    (a, b) =>
                        a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
                )
                .slice(
                    0,
                    userSessions.length -
                        SECURITY_CONFIG.session.maxSessionsPerUser,
                );

            for (const session of sessionsToRemove) {
                this.invalidateSession(session.id);
            }

            this.logger.log(
                `Removed ${sessionsToRemove.length} old sessions for user: ${userId.substring(0, 8)}...`,
            );
        }
    }

    private sanitizeUserAgent(userAgent: string): string {
        if (!userAgent) return 'Unknown';
        return userAgent.substring(0, 256);
    }

    cleanup(): number {
        const now = new Date();
        let removed = 0;

        for (const [sessionId, session] of this.sessionStore.entries()) {
            if (now > session.expiresAt || !session.isValid) {
                this.sessionStore.delete(sessionId);
                removed++;
            }
        }

        if (removed > 0) {
            this.logger.log(`Cleaned up ${removed} expired sessions`);
        }

        return removed;
    }
}

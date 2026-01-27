import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
    SessionData,
    SessionValidationResult,
} from '../interfaces/security.interfaces';
import { SECURITY_CONFIG } from '../constants/security.constants';
import { RedisService } from 'src/common/redis/redis.service';

const SESSION_KEY_PREFIX = 'session:';
const USER_SESSIONS_KEY_PREFIX = 'user_sessions:';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);
    private readonly memoryStore = new Map<string, SessionData>();

    constructor(private readonly redis: RedisService) {}

    private useRedis(): boolean {
        return this.redis.isAvailable();
    }

    private getSessionKey(sessionId: string): string {
        return `${SESSION_KEY_PREFIX}${sessionId}`;
    }

    private getUserSessionsKey(userId: string): string {
        return `${USER_SESSIONS_KEY_PREFIX}${userId}`;
    }

    private getTtlSeconds(): number {
        return Math.floor(SECURITY_CONFIG.session.sessionTtl / 1000);
    }

    private serializeSession(session: SessionData): string {
        return JSON.stringify({
            ...session,
            createdAt: session.createdAt.toISOString(),
            lastAccessedAt: session.lastAccessedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
        });
    }

    private deserializeSession(data: string): SessionData {
        const parsed = JSON.parse(data) as {
            id: string;
            userId: string;
            ip: string;
            userAgent: string;
            createdAt: string;
            lastAccessedAt: string;
            expiresAt: string;
            isValid: boolean;
        };
        return {
            id: parsed.id,
            userId: parsed.userId,
            ip: parsed.ip,
            userAgent: parsed.userAgent,
            createdAt: new Date(parsed.createdAt),
            lastAccessedAt: new Date(parsed.lastAccessedAt),
            expiresAt: new Date(parsed.expiresAt),
            isValid: parsed.isValid,
        };
    }

    async createSession(
        userId: string,
        ip: string,
        userAgent: string,
    ): Promise<SessionData> {
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

        if (this.useRedis()) {
            await this.redis.set(
                this.getSessionKey(sessionId),
                this.serializeSession(sessionData),
                this.getTtlSeconds(),
            );
            await this.redis.sadd(this.getUserSessionsKey(userId), sessionId);
            await this.redis.expire(
                this.getUserSessionsKey(userId),
                this.getTtlSeconds(),
            );
        } else {
            this.memoryStore.set(sessionId, sessionData);
        }

        await this.enforceMaxSessions(userId);

        this.logger.log(
            `Session created for user: ${userId.substring(0, 8)}..., IP: ${ip}`,
        );

        return sessionData;
    }

    async validateSession(
        sessionId: string,
        ip?: string,
    ): Promise<SessionValidationResult> {
        if (!sessionId) {
            return { valid: false, reason: 'No session ID provided' };
        }

        const session = await this.getSession(sessionId);

        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        if (!session.isValid) {
            return { valid: false, reason: 'Session has been invalidated' };
        }

        const now = new Date();
        if (now > session.expiresAt) {
            await this.invalidateSession(sessionId);
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
        if (this.useRedis()) {
            const remainingTtl = Math.floor(
                (session.expiresAt.getTime() - now.getTime()) / 1000,
            );
            if (remainingTtl > 0) {
                await this.redis.set(
                    this.getSessionKey(sessionId),
                    this.serializeSession(session),
                    remainingTtl,
                );
            }
        } else {
            this.memoryStore.set(sessionId, session);
        }

        return { valid: true, session };
    }

    async invalidateSession(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session) {
            if (this.useRedis()) {
                await this.redis.del(this.getSessionKey(sessionId));
                await this.redis.srem(
                    this.getUserSessionsKey(session.userId),
                    sessionId,
                );
            } else {
                this.memoryStore.delete(sessionId);
            }
            this.logger.log(
                `Session invalidated: ${sessionId.substring(0, 8)}...`,
            );
        }
    }

    async invalidateAllUserSessions(userId: string): Promise<number> {
        const sessions = await this.getUserSessions(userId);
        let count = 0;

        for (const session of sessions) {
            await this.invalidateSession(session.id);
            count++;
        }

        if (this.useRedis()) {
            await this.redis.del(this.getUserSessionsKey(userId));
        }

        this.logger.log(
            `Invalidated ${count} sessions for user: ${userId.substring(0, 8)}...`,
        );
        return count;
    }

    async getUserSessions(userId: string): Promise<SessionData[]> {
        if (this.useRedis()) {
            const sessionIds = await this.redis.smembers(
                this.getUserSessionsKey(userId),
            );
            if (sessionIds.length === 0) return [];

            const sessionKeys = sessionIds.map((id) => this.getSessionKey(id));
            const sessionDataList = await this.redis.mget(...sessionKeys);

            const sessions: SessionData[] = [];
            const invalidSessionIds: string[] = [];

            for (let i = 0; i < sessionDataList.length; i++) {
                const data = sessionDataList[i];
                if (data) {
                    try {
                        const session = this.deserializeSession(data);
                        if (session.isValid && new Date() < session.expiresAt) {
                            sessions.push(session);
                        } else {
                            invalidSessionIds.push(sessionIds[i]);
                        }
                    } catch {
                        invalidSessionIds.push(sessionIds[i]);
                    }
                } else {
                    invalidSessionIds.push(sessionIds[i]);
                }
            }

            if (invalidSessionIds.length > 0) {
                await this.redis.srem(
                    this.getUserSessionsKey(userId),
                    ...invalidSessionIds,
                );
            }

            return sessions.sort(
                (a, b) =>
                    b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime(),
            );
        } else {
            const sessions: SessionData[] = [];
            for (const session of this.memoryStore.values()) {
                if (session.userId === userId && session.isValid) {
                    sessions.push(session);
                }
            }
            return sessions.sort(
                (a, b) =>
                    b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime(),
            );
        }
    }

    async getSession(sessionId: string): Promise<SessionData | undefined> {
        if (this.useRedis()) {
            const data = await this.redis.get(this.getSessionKey(sessionId));
            if (!data) return undefined;
            try {
                return this.deserializeSession(data);
            } catch {
                return undefined;
            }
        } else {
            return this.memoryStore.get(sessionId);
        }
    }

    async refreshSession(sessionId: string): Promise<SessionData | null> {
        const session = await this.getSession(sessionId);
        if (!session || !session.isValid) {
            return null;
        }

        const now = new Date();
        session.lastAccessedAt = now;
        session.expiresAt = new Date(
            now.getTime() + SECURITY_CONFIG.session.sessionTtl,
        );

        if (this.useRedis()) {
            await this.redis.set(
                this.getSessionKey(sessionId),
                this.serializeSession(session),
                this.getTtlSeconds(),
            );
        } else {
            this.memoryStore.set(sessionId, session);
        }

        return session;
    }

    private async enforceMaxSessions(userId: string): Promise<void> {
        const userSessions = await this.getUserSessions(userId);

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
                await this.invalidateSession(session.id);
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
        if (this.useRedis()) {
            return 0;
        }

        const now = new Date();
        let removed = 0;

        for (const [sessionId, session] of this.memoryStore.entries()) {
            if (now > session.expiresAt || !session.isValid) {
                this.memoryStore.delete(sessionId);
                removed++;
            }
        }

        if (removed > 0) {
            this.logger.log(`Cleaned up ${removed} expired sessions`);
        }

        return removed;
    }
}

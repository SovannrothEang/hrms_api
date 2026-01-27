import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CsrfValidationResult } from '../interfaces/security.interfaces';
import { SECURITY_CONFIG } from '../constants/security.constants';

@Injectable()
export class CsrfService {
    private readonly logger = new Logger(CsrfService.name);
    private readonly tokenStore = new Map<
        string,
        { token: string; createdAt: number }
    >();

    generateToken(sessionId: string): string {
        const token = crypto
            .randomBytes(SECURITY_CONFIG.csrf.tokenLength)
            .toString('hex');
        const timestamp = Date.now();

        this.tokenStore.set(sessionId, { token, createdAt: timestamp });

        this.logger.debug(
            `CSRF token generated for session: ${sessionId.substring(0, 8)}...`,
        );

        return token;
    }

    validateToken(sessionId: string, token: string): CsrfValidationResult {
        if (!sessionId || !token) {
            return { valid: false, reason: 'Missing session ID or CSRF token' };
        }

        const stored = this.tokenStore.get(sessionId);

        if (!stored) {
            return { valid: false, reason: 'No CSRF token found for session' };
        }

        const tokenAge = Date.now() - stored.createdAt;
        if (tokenAge > SECURITY_CONFIG.session.sessionTtl) {
            this.tokenStore.delete(sessionId);
            return { valid: false, reason: 'CSRF token expired' };
        }

        const isValid = crypto.timingSafeEqual(
            Buffer.from(stored.token),
            Buffer.from(token),
        );

        if (!isValid) {
            this.logger.warn(
                `CSRF validation failed for session: ${sessionId.substring(0, 8)}...`,
            );
            return { valid: false, reason: 'Invalid CSRF token' };
        }

        return { valid: true };
    }

    rotateToken(sessionId: string): string {
        this.tokenStore.delete(sessionId);
        return this.generateToken(sessionId);
    }

    invalidateToken(sessionId: string): void {
        this.tokenStore.delete(sessionId);
        this.logger.debug(
            `CSRF token invalidated for session: ${sessionId.substring(0, 8)}...`,
        );
    }

    isPathExcluded(path: string): boolean {
        return SECURITY_CONFIG.csrf.excludePaths.some((excludedPath) =>
            path.startsWith(excludedPath),
        );
    }

    cleanup(): void {
        const now = Date.now();
        for (const [sessionId, data] of this.tokenStore.entries()) {
            if (now - data.createdAt > SECURITY_CONFIG.session.sessionTtl) {
                this.tokenStore.delete(sessionId);
            }
        }
    }
}

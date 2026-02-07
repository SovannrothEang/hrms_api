import { Request } from 'express';
import { UserPayload } from 'src/common/decorators/current-user.decorator';

export interface SessionData {
    id: string;
    userId: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
    lastAccessedAt: Date;
    expiresAt: Date;
    isValid: boolean;
}

export interface SecurityEventData {
    id: string;
    eventType: SecurityEventType;
    userId?: string;
    sessionId?: string;
    ip: string;
    userAgent: string;
    severity: SecuritySeverity;
    details?: Record<string, unknown>;
    timestamp: Date;
}

export type SecurityEventType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'TOKEN_REFRESH'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_SUCCESS'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'SESSION_CREATED'
    | 'SESSION_INVALIDATED'
    | 'SESSION_EXPIRED'
    | 'CSRF_VALIDATION_FAILED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'UNAUTHORIZED_ACCESS'
    | 'SUSPICIOUS_ACTIVITY'
    | 'IP_MISMATCH'
    | 'MULTIPLE_FAILED_ATTEMPTS';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
    domain?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    sessionId: string;
    expiresAt: number;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        username: string;
        roles: string[];
    };
    expiresAt: number;
}

export interface CsrfValidationResult {
    valid: boolean;
    reason?: string;
}

export interface SessionValidationResult {
    valid: boolean;
    session?: SessionData;
    reason?: string;
}

export interface RequestWithSecurity extends Request {
    user?: UserPayload;
    sessionId?: string;
    csrfToken?: string;
    securityContext?: {
        ip: string;
        userAgent: string;
        sessionId?: string;
    };
}

export interface SecurityConfig {
    csrf: {
        enabled: boolean;
        tokenLength: number;
        headerName: string;
        cookieName: string;
        excludePaths: string[];
    };
    session: {
        accessTokenTtl: number;
        refreshTokenTtl: number;
        sessionTtl: number;
        maxSessionsPerUser: number;
        validateIp: boolean;
    };
    cookies: {
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
        domain?: string;
    };
    rateLimit: {
        loginAttempts: number;
        loginWindowMs: number;
        lockoutDurationMs: number;
    };
}

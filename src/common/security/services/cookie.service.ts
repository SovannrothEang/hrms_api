import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CookieOptions } from '../interfaces/security.interfaces';
import { COOKIE_NAMES, SECURITY_CONFIG } from '../constants/security.constants';

@Injectable()
export class CookieService {
    private readonly logger = new Logger(CookieService.name);

    private getBaseCookieOptions(): Omit<CookieOptions, 'maxAge' | 'path'> {
        return {
            httpOnly: true,
            secure: SECURITY_CONFIG.cookies.secure,
            sameSite: SECURITY_CONFIG.cookies.sameSite,
            domain: SECURITY_CONFIG.cookies.domain,
        };
    }

    setAccessTokenCookie(res: Response, token: string): void {
        res.cookie(COOKIE_NAMES.ACCESS_TOKEN, token, {
            ...this.getBaseCookieOptions(),
            httpOnly: true,
            maxAge: SECURITY_CONFIG.session.accessTokenTtl,
            path: '/',
        });
        this.logger.debug('Access token cookie set');
    }

    setRefreshTokenCookie(res: Response, token: string): void {
        res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
            ...this.getBaseCookieOptions(),
            httpOnly: true,
            maxAge: SECURITY_CONFIG.session.refreshTokenTtl,
            path: '/api/auth',
        });
        this.logger.debug('Refresh token cookie set');
    }

    setCsrfTokenCookie(res: Response, token: string): void {
        res.cookie(COOKIE_NAMES.CSRF_TOKEN, token, {
            ...this.getBaseCookieOptions(),
            httpOnly: false,
            maxAge: SECURITY_CONFIG.session.sessionTtl,
            path: '/',
        });
        this.logger.debug('CSRF token cookie set');
    }

    setSessionIdCookie(res: Response, sessionId: string): void {
        res.cookie(COOKIE_NAMES.SESSION_ID, sessionId, {
            ...this.getBaseCookieOptions(),
            httpOnly: true,
            maxAge: SECURITY_CONFIG.session.sessionTtl,
            path: '/',
        });
        this.logger.debug('Session ID cookie set');
    }

    setAllAuthCookies(
        res: Response,
        tokens: {
            accessToken: string;
            refreshToken: string;
            csrfToken: string;
            sessionId: string;
        },
    ): void {
        this.setAccessTokenCookie(res, tokens.accessToken);
        this.setRefreshTokenCookie(res, tokens.refreshToken);
        this.setCsrfTokenCookie(res, tokens.csrfToken);
        this.setSessionIdCookie(res, tokens.sessionId);
    }

    clearAuthCookies(res: Response): void {
        const cookieNames = Object.values(COOKIE_NAMES);

        for (const name of cookieNames) {
            res.clearCookie(name, {
                httpOnly: true,
                secure: SECURITY_CONFIG.cookies.secure,
                sameSite: SECURITY_CONFIG.cookies.sameSite,
                path: name === COOKIE_NAMES.REFRESH_TOKEN ? '/api/auth' : '/',
                domain: SECURITY_CONFIG.cookies.domain,
            });
        }

        this.logger.debug('All auth cookies cleared');
    }

    extractCookies(cookies: Record<string, string>): {
        accessToken?: string;
        refreshToken?: string;
        csrfToken?: string;
        sessionId?: string;
    } {
        return {
            accessToken: cookies[COOKIE_NAMES.ACCESS_TOKEN],
            refreshToken: cookies[COOKIE_NAMES.REFRESH_TOKEN],
            csrfToken: cookies[COOKIE_NAMES.CSRF_TOKEN],
            sessionId: cookies[COOKIE_NAMES.SESSION_ID],
        };
    }
}

export const SECURITY_CONFIG = {
    csrf: {
        enabled: true,
        tokenLength: 32,
        headerName: 'x-csrf-token',
        cookieName: 'csrf_token',
        excludePaths: ['/api/auth/login', '/api/auth/register', '/api/health'],
    },
    session: {
        accessTokenTtl: 60 * 60 * 1000, // 1 hour in ms
        refreshTokenTtl: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        sessionTtl: 24 * 60 * 60 * 1000, // 24 hours in ms
        maxSessionsPerUser: 5,
        validateIp: false, // Set to true for stricter security (may cause issues with mobile users)
    },
    cookies: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'none') as 'strict' | 'lax' | 'none',
        domain: process.env.COOKIE_DOMAIN || undefined,
    },
    rateLimit: {
        loginAttempts: 5,
        loginWindowMs: 60 * 1000, // 1 minute
        lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    },
    jwt: {
        accessTokenExpiry: 60 * 60, // 1 hour in seconds
        refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
    },
};

export const COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    CSRF_TOKEN: 'csrf_token',
    SESSION_ID: 'session_id',
} as const;

export const SECURITY_HEADERS = {
    CSRF_TOKEN: 'x-csrf-token',
    SESSION_ID: 'x-session-id',
    REQUEST_ID: 'x-request-id',
} as const;

export const MASKED_FIELD_VALUE = '********';

export const SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'resetToken',
    'refreshToken',
    'accessToken',
    'csrfToken',
    'ssn',
    'socialSecurityNumber',
    'bankAccountNumber',
    'routingNumber',
    'creditCardNumber',
    'cvv',
] as const;

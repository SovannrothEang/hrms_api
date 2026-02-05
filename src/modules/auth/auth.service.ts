import {
    Inject,
    forwardRef,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../iam/users/users.service';
import { UserDto } from '../iam/users/dtos/user.dto';
import { RegisterDto } from './dtos/register.dto';
import { UserPayload } from 'src/common/decorators/current-user.decorator';
import { Result } from 'src/common/logic/result';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from 'src/common/security/services/session.service';
import { CsrfService } from 'src/common/security/services/csrf.service';
import { SecurityEventService } from 'src/common/security/services/security-event.service';
import {
    AuthTokens,
    AuthResponse,
} from 'src/common/security/interfaces/security.interfaces';
import { SECURITY_CONFIG } from 'src/common/security/constants/security.constants';
import { AttendanceDto } from '../attendances/dtos/attendance.dto';
import { AttendancesService } from '../attendances/attendances.service';

export interface SecureAuthResult {
    tokens: AuthTokens;
    user: AuthResponse['user'];
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService,
        private readonly csrfService: CsrfService,
        private readonly securityEventService: SecurityEventService,
        @Inject(forwardRef(() => AttendancesService))
        private readonly attendanceService: AttendancesService,
    ) { }

    async signInAsync(
        email: string,
        password: string,
    ): Promise<Result<{ token: string }>> {
        this.logger.log('Signing in user with {email}.', email);

        const user = await this.prisma.client.user.findFirst({
            where: { email, isActive: true },
            include: {
                userRoles: { include: { role: true } },
            },
        });

        const dummyHash =
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtoG0f1CJ.fne';
        const passwordToCompare = user?.password ?? dummyHash;
        const isMatch = await bcrypt.compare(password, passwordToCompare);

        if (!user || !isMatch) {
            this.logger.warn('Invalid credentials attempt');
            throw new UnauthorizedException('Invalid email or password');
        }

        const roles = user.userRoles.map((e) => e.role.name);
        if (roles.length <= 0) {
            this.logger.warn('User has no roles!');
            throw new UnauthorizedException('Roles do not match!');
        }

        const payloads: UserPayload = {
            sub: user.id,
            email: user.email,
            roles: roles,
        };
        return Result.ok({ token: await this.jwtService.signAsync(payloads) });
    }

    async signInSecureAsync(
        email: string,
        password: string,
        ip: string,
        userAgent: string,
    ): Promise<Result<SecureAuthResult>> {
        this.logger.log('Signing in user securely with {email}.', email);

        const failedAttempts = this.securityEventService.getFailedLoginAttempts(
            ip,
            SECURITY_CONFIG.rateLimit.loginWindowMs,
        );

        if (failedAttempts >= SECURITY_CONFIG.rateLimit.loginAttempts) {
            this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
            await this.securityEventService.logEvent('RATE_LIMIT_EXCEEDED', {
                ip,
                userAgent,
                severity: 'HIGH',
                details: { email, failedAttempts },
            });
            throw new UnauthorizedException(
                'Too many login attempts. Please try again later.',
            );
        }

        const user = await this.prisma.client.user.findFirst({
            where: { email, isActive: true },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        const dummyHash =
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtoG0f1CJ.fne';
        const passwordToCompare = user?.password ?? dummyHash;
        const isMatch = await bcrypt.compare(password, passwordToCompare);

        if (!user || !isMatch) {
            this.logger.warn('Invalid credentials attempt');
            await this.securityEventService.logLoginFailed(
                email,
                ip,
                userAgent,
                'Invalid credentials',
            );
            throw new UnauthorizedException('Invalid email or password');
        }

        const roles = user.userRoles.map((e) => e.role.name);
        if (roles.length <= 0) {
            this.logger.warn('User has no roles!');
            await this.securityEventService.logLoginFailed(
                email,
                ip,
                userAgent,
                'No roles assigned',
            );
            throw new UnauthorizedException('Roles do not match!');
        }

        const session = await this.sessionService.createSession(
            user.id,
            ip,
            userAgent,
        );

        const csrfToken = this.csrfService.generateToken(session.id);

        const payload: UserPayload = {
            sub: user.id,
            email: user.email,
            roles: roles,
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: SECURITY_CONFIG.jwt.accessTokenExpiry,
        });

        const refreshToken = await this.jwtService.signAsync(
            { sub: user.id, type: 'refresh', sessionId: session.id },
            { expiresIn: SECURITY_CONFIG.jwt.refreshTokenExpiry },
        );

        await this.securityEventService.logLoginSuccess(user.id, ip, userAgent);

        const tokens: AuthTokens = {
            accessToken,
            refreshToken,
            csrfToken,
            sessionId: session.id,
            expiresAt: Date.now() + SECURITY_CONFIG.session.accessTokenTtl,
        };

        return Result.ok({
            tokens,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                roles,
            },
        });
    }

    async logoutAsync(
        userId: string,
        sessionId: string,
        ip: string,
        userAgent: string,
    ): Promise<Result<void>> {
        this.logger.log('Logging out user');

        if (sessionId) {
            await this.sessionService.invalidateSession(sessionId);
            this.csrfService.invalidateToken(sessionId);
        }

        await this.securityEventService.logLogout(
            userId,
            sessionId,
            ip,
            userAgent,
        );

        return Result.ok();
    }

    async logoutAllSessionsAsync(
        userId: string,
        ip: string,
        userAgent: string,
    ): Promise<Result<{ count: number }>> {
        this.logger.log('Logging out all sessions for user');

        const sessions = await this.sessionService.getUserSessions(userId);
        for (const session of sessions) {
            this.csrfService.invalidateToken(session.id);
        }

        const count =
            await this.sessionService.invalidateAllUserSessions(userId);

        await this.securityEventService.logEvent('SESSION_INVALIDATED', {
            userId,
            ip,
            userAgent,
            severity: 'INFO',
            details: {
                sessionCount: count,
                reason: 'User logged out all sessions',
            },
        });

        return Result.ok({ count });
    }

    async registerAsync(dto: RegisterDto): Promise<Result<UserDto>> {
        this.logger.log('Registering user with {email}.', dto.email);

        const isEmailExist = await this.prisma.client.user.findFirst({
            where: { email: dto.email },
        });
        if (isEmailExist) {
            this.logger.warn('Email already exists!');
            return Result.fail('Credentials is already registered!');
        }

        const isUserNameExist = await this.prisma.client.user.findFirst({
            where: { username: dto.username },
        });
        if (isUserNameExist) {
            this.logger.warn('Username already exists!');
            return Result.fail('Credentials is already registered!');
        }

        if (dto.password !== dto.confirmPassword) {
            this.logger.warn('Passwords do not match!');
            return Result.fail('Passwords do not match!');
        }

        return await this.usersService.createAsync({
            username: dto.username,
            email: dto.email,
            password: dto.password,
        });
    }

    validateToken(token: string): UserPayload {
        this.logger.log('Validating token with {token}.', token);

        try {
            return this.jwtService.verify<UserPayload>(token);
        } catch {
            this.logger.warn('Invalid token!');
            throw new UnauthorizedException('Invalid token');
        }
    }

    async getMe(userId: string): Promise<Result<UserDto>> {
        this.logger.log('Getting current user');
        return await this.usersService.findOneByIdAsync(userId);
    }

    async getMyAttendance(userId: string): Promise<Result<AttendanceDto>> {
        this.logger.log('Getting my attendance');
        const result = await this.attendanceService.findOneByIdAsync(
            userId,
            true,
        );
        if (result === null) {
            throw new NotFoundException('Attendance not found');
        }
        return result;
    }

    async refreshToken(
        refreshToken: string,
    ): Promise<Result<{ token: string }>> {
        this.logger.log('Refreshing token');

        try {
            const payload = this.jwtService.verify<UserPayload>(refreshToken);

            const user = await this.prisma.client.user.findFirst({
                where: { id: payload.sub, isActive: true },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const roles = user.userRoles.map((e) => e.role.name);
            if (roles.length <= 0) {
                throw new UnauthorizedException('Roles do not match!');
            }

            const payloads: UserPayload = {
                sub: user.id,
                email: user.email,
                roles: roles,
            };

            return Result.ok({
                token: await this.jwtService.signAsync(payloads),
            });
        } catch {
            this.logger.warn('Invalid refresh token');
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async refreshTokenSecureAsync(
        refreshToken: string,
        sessionId: string,
        ip: string,
        userAgent: string,
    ): Promise<Result<SecureAuthResult>> {
        this.logger.log('Refreshing token securely');

        try {
            const payload = this.jwtService.verify<{
                sub: string;
                type: string;
                sessionId: string;
            }>(refreshToken);

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            if (payload.sessionId !== sessionId) {
                await this.securityEventService.logSuspiciousActivity(
                    payload.sub,
                    ip,
                    userAgent,
                    'Session ID mismatch during token refresh',
                    {
                        expectedSessionId: payload.sessionId,
                        providedSessionId: sessionId,
                    },
                );
                throw new UnauthorizedException('Session mismatch');
            }

            const sessionValidation = await this.sessionService.validateSession(
                sessionId,
                ip,
            );
            if (!sessionValidation.valid) {
                throw new UnauthorizedException(
                    sessionValidation.reason || 'Invalid session',
                );
            }

            const user = await this.prisma.client.user.findFirst({
                where: { id: payload.sub, isActive: true },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const roles = user.userRoles.map((e) => e.role.name);
            if (roles.length <= 0) {
                throw new UnauthorizedException('Roles do not match!');
            }

            await this.sessionService.refreshSession(sessionId);
            const csrfToken = this.csrfService.rotateToken(sessionId);

            const userPayload: UserPayload = {
                sub: user.id,
                email: user.email,
                roles: roles,
            };

            const accessToken = await this.jwtService.signAsync(userPayload, {
                expiresIn: SECURITY_CONFIG.jwt.accessTokenExpiry,
            });

            const newRefreshToken = await this.jwtService.signAsync(
                { sub: user.id, type: 'refresh', sessionId },
                { expiresIn: SECURITY_CONFIG.jwt.refreshTokenExpiry },
            );

            await this.securityEventService.logEvent('TOKEN_REFRESH', {
                userId: user.id,
                sessionId,
                ip,
                userAgent,
                severity: 'INFO',
            });

            return Result.ok({
                tokens: {
                    accessToken,
                    refreshToken: newRefreshToken,
                    csrfToken,
                    sessionId,
                    expiresAt:
                        Date.now() + SECURITY_CONFIG.session.accessTokenTtl,
                },
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles,
                },
            });
        } catch (error) {
            this.logger.warn('Invalid refresh token');
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async forgotPassword(email: string): Promise<Result<void>> {
        this.logger.log('Forgot password request for {email}', email);

        const user = await this.prisma.client.user.findFirst({
            where: { email, isActive: true },
        });

        if (!user) {
            return Result.ok();
        }

        const resetToken = uuidv4();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await this.prisma.client.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        this.logger.log(`Reset token for ${email}: ${resetToken}`);

        return Result.ok();
    }

    async resetPassword(
        token: string,
        newPassword: string,
    ): Promise<Result<void>> {
        this.logger.log('Resetting password with token');

        const user = await this.prisma.client.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
                isActive: true,
            },
        });

        if (!user) {
            return Result.fail('Invalid or expired reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.client.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return Result.ok();
    }

    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string,
    ): Promise<Result<void>> {
        this.logger.log('Changing password for user {userId}', userId);

        const user = await this.prisma.client.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return Result.fail('User not found');
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return Result.fail('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.client.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return Result.ok();
    }

    async getUserSessionsAsync(userId: string): Promise<
        Result<
            Array<{
                id: string;
                ip: string;
                userAgent: string;
                createdAt: Date;
                lastAccessedAt: Date;
            }>
        >
    > {
        const sessions = await this.sessionService.getUserSessions(userId);
        return Result.ok(
            sessions.map((s) => ({
                id: s.id.substring(0, 8) + '...',
                ip: s.ip,
                userAgent: s.userAgent,
                createdAt: s.createdAt,
                lastAccessedAt: s.lastAccessedAt,
            })),
        );
    }
}

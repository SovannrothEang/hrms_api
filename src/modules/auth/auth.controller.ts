import {
    Body,
    Controller,
    Get,
    Post,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    Res,
    Req,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Auth, AuthWithCsrf } from 'src/common/decorators/auth.decorator';
import { CookieService } from 'src/common/security/services/cookie.service';
import type { AuthResponse } from 'src/common/security/interfaces/security.interfaces';
import {
    SkipCsrf,
    PublicEndpoint,
} from 'src/common/security/decorators/skip-security.decorator';
import { COOKIE_NAMES } from 'src/common/security/constants/security.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly cookieService: CookieService,
    ) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @PublicEndpoint()
    @ApiOperation({ summary: 'User login with secure cookies' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid credentials',
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: 'Too many login attempts',
    })
    async signIn(
        @Body() loginDto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponse> {
        const ip = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const result = await this.authService.signInSecureAsync(
            loginDto.email,
            loginDto.password,
            ip,
            userAgent,
        );

        const data = result.getData();

        this.cookieService.setAllAuthCookies(res, data.tokens);

        return {
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            user: data.user,
            expiresAt: data.tokens.expiresAt,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @Auth()
    @SkipCsrf()
    @ApiOperation({ summary: 'User logout' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Logout successful' })
    async logout(
        @CurrentUser('sub') userId: string,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        const cookies = req.cookies as Record<string, string> | undefined;
        const sessionId = cookies?.[COOKIE_NAMES.SESSION_ID] || '';
        const ip = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        await this.authService.logoutAsync(userId, sessionId, ip, userAgent);

        this.cookieService.clearAuthCookies(res);

        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    @AuthWithCsrf()
    @ApiOperation({ summary: 'Logout from all sessions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'All sessions terminated',
    })
    async logoutAll(
        @CurrentUser('sub') userId: string,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string; sessionsTerminated: number }> {
        const ip = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const result = await this.authService.logoutAllSessionsAsync(
            userId,
            ip,
            userAgent,
        );

        this.cookieService.clearAuthCookies(res);

        return {
            message: 'All sessions terminated',
            sessionsTerminated: result.getData().count,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @SkipCsrf()
    @ApiOperation({ summary: 'Refresh access token using secure cookies' })
    @ApiCookieAuth()
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token refreshed successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid refresh token',
    })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponse> {
        const cookies = req.cookies as Record<string, string> | undefined;
        const refreshToken = cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
        const sessionId = cookies?.[COOKIE_NAMES.SESSION_ID];

        if (!refreshToken || !sessionId) {
            throw new UnauthorizedException('Missing authentication cookies');
        }

        const ip = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const result = await this.authService.refreshTokenSecureAsync(
            refreshToken,
            sessionId,
            ip,
            userAgent,
        );

        const data = result.getData();

        this.cookieService.setAllAuthCookies(res, data.tokens);

        return {
            accessToken: data.tokens.accessToken,
            refreshToken: refreshToken,
            user: data.user,
            expiresAt: data.tokens.expiresAt,
        };
    }

    @Post('refresh-legacy')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @PublicEndpoint()
    @ApiOperation({ summary: 'Refresh access token (legacy - body based)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token refreshed successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid refresh token',
    })
    async refreshLegacy(@Body() dto: RefreshTokenDto) {
        const result = await this.authService.refreshToken(dto.refreshToken);
        return result.getData();
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @PublicEndpoint()
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Reset email sent (or user not found)',
    })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        await this.authService.forgotPassword(dto.email);
        return { message: 'If the email exists, a reset link has been sent' };
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @PublicEndpoint()
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Password reset successfully',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid or expired token',
    })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const result = await this.authService.resetPassword(
            dto.token,
            dto.newPassword,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return { message: 'Password reset successfully' };
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @AuthWithCsrf()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Change password (authenticated)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Password changed successfully',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid current password',
    })
    async changePassword(
        @Body() dto: ChangePasswordDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.authService.changePassword(
            userId,
            dto.oldPassword,
            dto.newPassword,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return { message: 'Password changed successfully' };
    }

    @Get(['me', 'session'])
    @Auth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return current user details',
    })
    async getMe(@CurrentUser('sub') userId?: string) {
        if (!userId)
            throw new UnauthorizedException('User is not authenticated!');
        const result = await this.authService.getMe(userId);
        if (!result.isSuccess)
            throw new UnauthorizedException('User is not authenticated!');
        return result.getData();
    }

    @Get('sessions')
    @Auth()
    @ApiOperation({ summary: 'Get current user sessions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return user active sessions',
    })
    async getSessions(@CurrentUser('sub') userId: string) {
        const result = await this.authService.getUserSessionsAsync(userId);
        return result.getData();
    }

    @Get('me/profile')
    @Auth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return current user details',
    })
    async getMeProfile(@CurrentUser('sub') userId: string) {
        const result = await this.authService.getMe(userId);
        if (!result.isSuccess)
            throw new UnauthorizedException('User is not authenticated!');
        return result.getData();
    }

    private getClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        return req.ip || req.socket?.remoteAddress || 'Unknown';
    }
}

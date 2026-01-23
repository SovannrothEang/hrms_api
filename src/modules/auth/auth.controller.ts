import {
    Body,
    Controller,
    Get,
    Post,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Auth } from 'src/common/decorators/auth.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for login
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid credentials',
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: 'Too many login attempts',
    })
    async signIn(@Body() loginDto: LoginDto) {
        const result = await this.authService.signInAsync(
            loginDto.email,
            loginDto.password,
        );
        return result.getData();
    }

    // @Post('register')
    // @ApiOperation({ summary: 'Register new user' })
    // @ApiResponse({ status: HttpStatus.CREATED, description: 'User successfully registered' })
    // @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request (e.g., email already exists)' })
    // async register(@Body() registerDto: RegisterDto) {
    //   const result = await this.authService.registerAsync(registerDto);
    //   if (!result.isSuccess) {
    //     throw new BadRequestException(result.error);
    //   }
    //   return result;
    // }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for refresh
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token refreshed successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid refresh token',
    })
    async refresh(@Body() dto: RefreshTokenDto) {
        const result = await this.authService.refreshToken(dto.refreshToken);
        return result.getData();
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
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
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
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
    @Auth()
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
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

    @Get('me')
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
}

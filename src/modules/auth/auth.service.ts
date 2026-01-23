import {
    Injectable,
    Logger,
    UnauthorizedException,
    BadRequestException,
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

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) {}

    async signInAsync(
        email: string,
        password: string,
    ): Promise<Result<{ token: string }>> {
        this.logger.log('Signing in user with {email}.', email);

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

        // Timing attack prevention: always run bcrypt compare
        // Use a dummy hash when user not found to maintain consistent timing
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
        } catch (error) {
            this.logger.warn('Invalid refresh token');
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async forgotPassword(email: string): Promise<Result<void>> {
        this.logger.log('Forgot password request for {email}', email);

        const user = await this.prisma.client.user.findFirst({
            where: { email, isActive: true },
        });

        if (!user) {
            // Don't reveal if user exists
            return Result.ok();
        }

        // Generate reset token
        const resetToken = uuidv4();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.client.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // TODO: Send email with reset token
        // For now, log it
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
}

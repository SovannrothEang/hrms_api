import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../iam/users/users.service';
import { UserDto } from '../iam/users/dtos/user.dto';
import { RegisterDto } from './dtos/register.dto';
import { UserPayload } from 'src/common/decorators/current-user.decorator';
import { Result } from 'src/common/logic/result';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) { }

    async signInAsync(email: string, password: string): Promise<Result<{ token: string }>> {
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
}

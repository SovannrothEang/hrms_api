import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import * as bcrypt from 'bcrypt';
import { UserUpdateDto } from './dtos/user-update.dto';
import { Result } from 'src/common/logic/result';
import { RoleName } from 'src/common/enums/roles.enum';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAllAsync() {
        this.logger.log('Getting all users');
        const users = await this.prisma.user.findMany({
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        return users.map((u) => plainToInstance(UserDto, u));
    }

    async findOneByIdAsync(userId: string): Promise<Result<UserDto>> {
        this.logger.log('Getting user with {id}.', userId);
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            include: {
                userRoles: { include: { role: true } },
            },
        });
        if (!user) {
            this.logger.warn('User not found!');
            return Result.fail('User not found!');
        }

        return Result.ok(plainToInstance(UserDto, user));
    }

    async isExistAsync(username?: string, email?: string, excludeId?: string): Promise<boolean> {
        const conditions: Prisma.UserWhereInput[] = [];

        if (username) {
            conditions.push({ username });
        }
        if (email) {
            conditions.push({ email });
        }

        if (conditions.length <= 0) {
            return false;
        }

        const user = await this.prisma.user.findFirst({
            where: {
                OR: conditions,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        return user !== null;
    }

    async createAsync(
        dto: UserCreateDto,
        performBy?: string,
        roleName: string = RoleName.ADMIN,
    ): Promise<Result<UserDto>> {
        this.logger.log(
            'Creating user with {username} and {email}.',
            dto.username,
            dto.email,
        );
        const role = await this.prisma.role.findFirst({
            where: { name: roleName.toUpperCase(), isActive: true },
        });
        if (!role) {
            this.logger.warn(`Role not found: {roleName}`, roleName);
            return Result.fail(`Role '${roleName}' does not exist!`);
        }

        const existingUser = await this.isExistAsync(dto.username, dto.email);
        if (existingUser) {
            this.logger.warn('User already exists!');
            return Result.fail('Username or Email already exists!');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                username: dto.username,
                password: hashedPassword,
                userRoles: {
                    create: {
                        roleId: role.id,
                        performBy: performBy,
                    },
                },
            },
            include: {
                userRoles: { include: { role: true } },
            },
        });
        return Result.ok(plainToInstance(UserDto, user));
    }

    async updateAsync(id: string, dto: UserUpdateDto): Promise<void> {
        this.logger.log('Update user with id: {id}.', id);
        const user = await this.prisma.user.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!user) {
            this.logger.warn('User not found!');
            throw new NotFoundException('User not found!');
        }

        // Exclude current user from duplicate check (self-update scenario)
        const existingUser = await this.isExistAsync(dto.username, dto.email, id);
        if (existingUser) {
            this.logger.warn('Username or email already taken by another user!');
            throw new BadRequestException('Username or Email already exists!');
        }

        await this.prisma.user.update({
            where: { id, isDeleted: false },
            data: {
                email: dto.email,
                username: dto.username,
            },
        });
    }

    async deleteAsync(id: string): Promise<void> {
        const user = await this.prisma.user.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found!');
        }

        await this.prisma.user.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
    }
}

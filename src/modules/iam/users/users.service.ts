import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma/prisma.service';
import { CommonMapper } from 'src/common/mappers/common.mapper';
import { Prisma } from '@prisma/client';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import * as bcrypt from 'bcrypt';
import { UserUpdateDto } from './dtos/user-update.dto';
import { UserQueryDto } from './dtos/user-query.dto';
import { Result } from 'src/common/logic/result';
import { RoleName } from 'src/common/enums/roles.enum';
import { FileStorageService } from 'src/common/services/file-storage/file-storage.service';

import { ResultPagination } from 'src/common/logic/result-pagination';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly fileStorage: FileStorageService,
    ) {}

    async findAllAsync(): Promise<Result<UserDto[]>> {
        this.logger.log('Getting all users');
        const users = await this.prisma.client.user.findMany({
            where: { isDeleted: false },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        return Result.ok(users.map((u) => CommonMapper.mapToUserDto(u)!));
    }

    async findAllPaginatedAsync(
        query: UserQueryDto,
    ): Promise<ResultPagination<UserDto>> {
        this.logger.log('Getting paginated users with filters');
        const {
            page = 1,
            limit = 10,
            search,
            role,
            isActive,
            createdAtFrom,
            createdAtTo,
            includeEmployees,
            sortBy = 'username',
            sortOrder = 'asc',
        } = query;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.UserWhereInput = { isDeleted: false };

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role) {
            where.userRoles = {
                some: {
                    role: {
                        name: {
                            equals: role,
                            mode: 'insensitive',
                        },
                        isDeleted: false,
                        isActive: true,
                    },
                },
            };
        }

        if (createdAtFrom || createdAtTo) {
            where.createdAt = {};
            if (createdAtFrom) {
                where.createdAt.gte = new Date(createdAtFrom);
            }
            if (createdAtTo) {
                const end = new Date(createdAtTo);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Build orderBy
        let orderBy: Prisma.UserOrderByWithRelationInput = {};
        if (sortBy === 'username') {
            orderBy = { username: sortOrder };
        } else if (sortBy === 'email') {
            orderBy = { email: sortOrder };
        } else if (sortBy === 'createdAt') {
            orderBy = { createdAt: sortOrder };
        } else if (sortBy === 'updatedAt') {
            orderBy = { updatedAt: sortOrder };
        }

        const [total, users] = await Promise.all([
            this.prisma.client.user.count({ where }),
            this.prisma.client.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                    employee: includeEmployees ? true : false,
                },
                orderBy,
            }),
        ]);

        const dtos = users.map((u) => CommonMapper.mapToUserDto(u)!);
        return ResultPagination.of(dtos, total, page, limit);
    }

    async findAllFilteredAsync(
        query: UserQueryDto,
    ): Promise<Result<ResultPagination<UserDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return Result.ok(paginationResult);
        } catch (error) {
            this.logger.error('Failed to fetch filtered users', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
    }

    async findOneByIdAsync(userId: string): Promise<Result<UserDto>> {
        this.logger.log('Getting user with {id}.', userId);
        const user = await this.prisma.client.user.findFirst({
            where: { id: userId },
            include: {
                employee: { include: { department: true, position: true } },
                userRoles: { include: { role: true } },
            },
        });
        if (!user) {
            this.logger.warn('User not found!');
            return Result.fail('User not found!');
        }

        return Result.ok(CommonMapper.mapToUserDto(user)!);
    }

    async isExistAsync(
        username?: string,
        email?: string,
        excludeId?: string,
    ): Promise<boolean> {
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

        const user = await this.prisma.client.user.findFirst({
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
        const normalizedRoleName = roleName.toUpperCase();
        let role = await this.prisma.client.role.findFirst({
            where: { name: normalizedRoleName, isActive: true },
        });
        if (!role) {
            this.logger.warn(
                'Role not found: {roleName}. Creating it.',
                roleName,
            );
            role = await this.prisma.client.role.create({
                data: {
                    name: normalizedRoleName,
                    performBy: performBy,
                },
            });
        }

        const existingUser = await this.isExistAsync(dto.username, dto.email);
        if (existingUser) {
            this.logger.warn('User already exists!');
            return Result.fail('Username or Email already exists!');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.client.user.create({
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
        return Result.ok(CommonMapper.mapToUserDto(user)!);
    }

    async updateAsync(
        id: string,
        dto: UserUpdateDto,
        performBy?: string,
    ): Promise<void> {
        this.logger.log('Update user with id: {id}.', id);
        const user = await this.prisma.client.user.findFirst({
            where: { id, isDeleted: false },
            select: { id: true },
        });
        if (!user) {
            this.logger.warn('User not found!');
            throw new NotFoundException('User not found!');
        }

        if (dto.username || dto.email) {
            const existingUser = await this.isExistAsync(
                dto.username,
                dto.email,
                id,
            );
            if (existingUser) {
                this.logger.warn(
                    'Username or email already taken by another user!',
                );
                throw new BadRequestException(
                    'Username or Email already exists!',
                );
            }
        }

        await this.prisma.client.$transaction(async (tx) => {
            const userData: Prisma.UserUpdateInput = {};
            if (dto.username !== undefined) {
                userData.username = dto.username;
            }
            if (dto.email !== undefined) {
                userData.email = dto.email;
            }

            if (Object.keys(userData).length > 0) {
                await tx.user.update({
                    where: { id, isDeleted: false },
                    data: userData,
                });
            }

            if (dto.roles !== undefined) {
                const roleNames = dto.roles.map((r) => r.toUpperCase());
                const roles = await tx.role.findMany({
                    where: {
                        name: { in: roleNames },
                        isActive: true,
                        isDeleted: false,
                    },
                });

                if (roles.length !== roleNames.length) {
                    const foundNames = roles.map((r) => r.name);
                    const missing = roleNames.filter(
                        (n) => !foundNames.includes(n),
                    );
                    throw new BadRequestException(
                        `Roles not found: ${missing.join(', ')}`,
                    );
                }

                await tx.userRole.deleteMany({
                    where: { userId: id },
                });

                await tx.userRole.createMany({
                    data: roles.map((role) => ({
                        userId: id,
                        roleId: role.id,
                        performBy: performBy,
                    })),
                });
            }
        });
    }

    async deleteAsync(id: string): Promise<void> {
        const user = await this.prisma.client.user.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found!');
        }

        await this.prisma.client.user.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
    }

    async uploadImageAsync(
        userId: string,
        file: Express.Multer.File,

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _performerId: string,
    ): Promise<Result<string>> {
        const user = await this.prisma.client.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                profileImage: true,
            },
        });

        if (!user) return Result.fail('User not found');

        const imagePath = await this.fileStorage.saveFileAsync(
            'users',
            userId,
            file,
        );

        await this.prisma.client.user.update({
            where: { id: userId },
            data: {
                profileImage: imagePath,
            },
        });

        if (user.profileImage) {
            await this.fileStorage.deleteFileAsync(user.profileImage);
        }

        return Result.ok(imagePath);
    }

    async removeImageAsync(
        userId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _performerId: string,
    ): Promise<Result<void>> {
        const user = await this.prisma.client.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                profileImage: true,
            },
        });

        if (!user) return Result.fail('User not found');
        if (!user.profileImage) return Result.ok();

        await this.prisma.client.user.update({
            where: { id: userId },
            data: {
                profileImage: null,
            },
        });

        await this.fileStorage.deleteFileAsync(user.profileImage);

        return Result.ok();
    }
}

import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { RoleDto } from './dtos/roles.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma/prisma.service';

import { ResultPagination } from 'src/common/logic/result-pagination';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAllAsync(
        childIncluded: boolean = false,
    ): Promise<Result<RoleDto[]>> {
        this.logger.log('Getting all roles');
        const roles = await this.prisma.client.role.findMany({
            include: {
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: {
                                      role: true,
                                  },
                              },
                          },
                      }
                    : false,
            },
        });
        return Result.ok(roles.map((e) => plainToInstance(RoleDto, e)));
    }

    async findAllPaginatedAsync(
        page: number,
        limit: number,
        childIncluded: boolean = false,
    ): Promise<ResultPagination<RoleDto>> {
        this.logger.log(
            `Getting paginated roles: page ${page}, limit ${limit}`,
        );
        const skip = (page - 1) * limit;

        const [total, roles] = await Promise.all([
            this.prisma.client.role.count({ where: { isDeleted: false } }),
            this.prisma.client.role.findMany({
                where: { isDeleted: false },
                skip,
                take: limit,
                include: {
                    performer: childIncluded
                        ? {
                              include: {
                                  userRoles: {
                                      include: {
                                          role: true,
                                      },
                                  },
                              },
                          }
                        : false,
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        const dtos = roles.map((e) => plainToInstance(RoleDto, e));
        return ResultPagination.of(dtos, total, page, limit);
    }

    async findOneByIdAsync(
        id: string,
        childIncluded: boolean = false,
    ): Promise<Result<RoleDto>> {
        this.logger.log('Getting role with id: {id}.', id);
        const role = await this.prisma.client.role.findFirst({
            where: { id },
            include: {
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: {
                                      role: true,
                                  },
                              },
                          },
                      }
                    : false,
            },
        });
        if (!role) {
            this.logger.warn('Role not found!');
            return Result.notFound(`No role was found with id: ${id}`);
        }
        return Result.ok(plainToInstance(RoleDto, role));
    }

    async isExistAsync(roleName: string, excludeId?: string): Promise<boolean> {
        this.logger.log(
            'Checking if role exists with name: {roleName}.',
            roleName,
        );
        const role = await this.prisma.client.role.findFirst({
            where: {
                name: roleName.toUpperCase(),
                isDeleted: false,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        return role !== null;
    }

    async createAsync(
        roleName: string,
        userId: string,
    ): Promise<Result<RoleDto>> {
        this.logger.log('Creating role with name: {roleName}.', roleName);
        const isExist = await this.isExistAsync(roleName);
        if (isExist) {
            this.logger.warn('Role already exists!');
            return Result.fail('Role already exists!');
        }

        const role = await this.prisma.client.role.create({
            data: {
                name: roleName.toUpperCase(),
                performer: {
                    connect: {
                        id: userId,
                    },
                },
            },
        });
        return Result.ok(plainToInstance(RoleDto, role));
    }

    async updateAsync(id: string, roleName: string, userId: string) {
        this.logger.log('Updating role with id: {id}.', id);
        const role = await this.prisma.client.role.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!role) {
            this.logger.warn('Role not found!');
            throw new NotFoundException('Role not found!');
        }

        const isExist = await this.isExistAsync(roleName);
        if (isExist) {
            this.logger.warn('Role already exists!');
            throw new BadRequestException('Role already exists!');
        }

        await this.prisma.client.role.update({
            where: { id },
            data: {
                name: roleName,
                performer: {
                    connect: {
                        id: userId,
                    },
                },
            },
        });
    }

    // Soft delete
    async deleteAsync(id: string, userId: string) {
        this.logger.log('Deleting role with id: {id}.', id);
        const role = await this.prisma.client.role.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!role) {
            this.logger.warn('Role not found!');
            throw new NotFoundException('Role not found!');
        }

        await this.prisma.client.role.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performer: { connect: { id: userId } },
            },
        });
    }
}

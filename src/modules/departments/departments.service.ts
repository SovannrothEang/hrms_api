import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/logic/result';
import { DepartmentDto, DepartmentDtoField } from './dtos/department.dto';
import { plainToInstance } from 'class-transformer';
import { DepartmentUpdateDto } from './dtos/department-update.dto';
import { DepartmentCreateDto } from './dtos/department-create.dto';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { DepartmentQueryDto } from './dtos/department-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
    private readonly logger = new Logger(DepartmentsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAllAsync(
        childIncluded: boolean = false,
    ): Promise<Result<DepartmentDto[]>> {
        this.logger.log('Getting all departments');
        const departments = await this.prisma.client.department.findMany({
            where: { isDeleted: false },
            include: {
                employees: childIncluded,
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: { include: { role: true } },
                          },
                      }
                    : false,
            },
            orderBy: { departmentName: 'asc' },
        });
        return Result.ok(
            departments.map((d) => plainToInstance(DepartmentDto, d)),
        );
    }

    async findAllPaginatedAsync(
        query: DepartmentQueryDto,
    ): Promise<ResultPagination<DepartmentDto>> {
        this.logger.log('Getting paginated departments');
        const {
            page = 1,
            limit = 10,
            name,
            employeeCountRange,
            isActive,
            sortBy,
            sortOrder,
            includeEmployees,
        } = query;

        const where: Prisma.DepartmentWhereInput = {
            isDeleted: false,
        };

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        if (name) {
            where.departmentName = {
                contains: name,
                mode: 'insensitive',
            };
        }

        const orderBy: Prisma.DepartmentOrderByWithRelationInput = {};
        if (sortBy === 'createdAt') {
            orderBy.createdAt = sortOrder;
        } else if (sortBy === 'employeeCount') {
            // Note: employeeCount sorting requires a different approach
            // We'll sort by departmentName as fallback
            orderBy.departmentName = sortOrder;
        } else {
            orderBy.departmentName = sortOrder;
        }

        const include = {
            employees: includeEmployees,
            performer: includeEmployees
                ? {
                      include: {
                          userRoles: { include: { role: true } },
                      },
                  }
                : false,
        };

        try {
            const [total, departments] = await Promise.all([
                this.prisma.client.department.count({ where }),
                this.prisma.client.department.findMany({
                    where,
                    skip: query.skip,
                    take: limit,
                    include,
                    orderBy,
                }),
            ]);

            // Apply employee count filtering after fetching (if needed)
            let filteredDepartments = departments;
            if (employeeCountRange) {
                const min = query.employeeCountMin;
                const max = query.employeeCountMax;

                filteredDepartments = departments.filter((dept) => {
                    const employeeCount = dept.employees?.length ?? 0;
                    if (min !== null && employeeCount < min) return false;
                    if (max !== null && employeeCount > max) return false;
                    return true;
                });
            }

            const data = filteredDepartments.map((d) =>
                plainToInstance(DepartmentDto, d),
            );

            return ResultPagination.of(data, total, page, limit);
        } catch (error) {
            this.logger.error('Failed to fetch paginated departments', error);
            throw error;
        }
    }

    async findOneByIdAsync(
        id: string,
        childIncluded: boolean = false,
    ): Promise<Result<DepartmentDto>> {
        this.logger.log('Getting department by id {departmentId}', id);
        const department = await this.prisma.client.department.findFirst({
            where: { id },
            include: {
                employees: childIncluded,
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: { include: { role: true } },
                          },
                      }
                    : false,
            },
        });
        if (!department) {
            return Result.fail(`Department not found with id: ${id}`);
        }
        return Result.ok(plainToInstance(DepartmentDto, department));
    }

    async createAsync(
        dto: DepartmentCreateDto,
        performBy: string,
    ): Promise<Result<DepartmentDto>> {
        this.logger.log('Creating department by user: {performBy}', performBy);
        const isExist = await this.prisma.client.department.findFirst({
            where: { departmentName: dto.name },
            select: { id: true },
        });
        if (isExist) {
            return Result.fail("Department's name already exists");
        }
        const department = await this.prisma.client.department.create({
            data: {
                departmentName: dto.name,
                performer: { connect: { id: performBy } },
            },
            select: DepartmentDtoField,
        });
        return Result.ok(plainToInstance(DepartmentDto, department));
    }

    async updateAsync(
        id: string,
        dto: DepartmentUpdateDto,
        performBy: string,
    ): Promise<void> {
        this.logger.log(
            'Updating department with id: {departmentId} by user: {performBy}',
            id,
            performBy,
        );
        await this.prisma.client.department.update({
            where: { id },
            data: {
                departmentName: dto.name,
                performer: { connect: { id: performBy } },
            },
        });
    }

    async deleteAsync(id: string, performBy: string): Promise<void> {
        this.logger.log(
            'Deleting department with id: {departmentId} by user: {performBy}',
            id,
            performBy,
        );
        await this.prisma.client.department.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performBy: performBy,
            },
        });
    }
}

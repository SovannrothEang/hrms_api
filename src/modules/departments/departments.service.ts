import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/logic/result';
import { DepartmentDto } from './dtos/department.dto';
import { plainToInstance } from 'class-transformer';
import { DepartmentUpdateDto } from './dtos/department-update.dto';
import { DepartmentCreateDto } from './dtos/department-create.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
    private readonly logger = new Logger(DepartmentsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAllAsync(
        childIncluded: boolean = false,
    ): Promise<Result<DepartmentDto[]>> {
        this.logger.log('Getting all departments');
        const departments = await this.prisma.department.findMany({
            include: {
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: { include: { role: true } },
                          },
                      }
                    : false,
            },
        });
        return Result.ok(
            departments.map((d) => plainToInstance(DepartmentDto, d)),
        );
    }

    async findAllWithEmployeeAsync(
        childIncluded: boolean = false,
    ): Promise<Result<DepartmentDto[]>> {
        this.logger.log('Getting all departments with employees');
        const departments = await this.prisma.department.findMany({
            include: {
                employees: true,
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: { include: { role: true } },
                          },
                      }
                    : false,
            },
        });
        return Result.ok(
            departments.map((d) => plainToInstance(DepartmentDto, d)),
        );
    }

    async findOneByIdAsync(
        id: string,
        childIncluded: boolean = false,
    ): Promise<Result<DepartmentDto>> {
        this.logger.log('Getting department by id');
        const department = await this.prisma.department.findFirst({
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
        return Result.ok(plainToInstance(DepartmentDto, department));
    }

    async createAsync(
        dto: DepartmentCreateDto,
        performBy: string,
    ): Promise<Result<DepartmentDto>> {
        this.logger.log('Creating department by user: {performBy}', performBy);
        const isExist = await this.prisma.department.findFirst({
            where: { departmentName: dto.name },
            select: { id: true },
        });
        if (isExist) {
            return Result.fail("Department's name already exists");
        }
        const department = await this.prisma.department.create({
            data: {
                departmentName: dto.name,
                performer: { connect: { id: performBy } },
            },
            select: {
                id: true,
                departmentName: true,
                employees: true,
                performer: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return Result.ok(plainToInstance(DepartmentDto, department));
    }

    async updateAsync(
        id: string,
        dto: DepartmentUpdateDto,
        performBy: string,
    ): Promise<void> {
        this.logger.log('Updating department by user: {performBy}', performBy);
        await this.prisma.department.update({
            where: { id },
            data: {
                departmentName: dto.name,
                performer: { connect: { id: performBy } },
            },
        });
    }

    async deleteAsync(id: string, performBy: string): Promise<void> {
        this.logger.log('Deleting department by user: {performBy}', performBy);
        await this.prisma.department.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performBy: performBy,
            },
        });
    }
}

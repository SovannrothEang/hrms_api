import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { EmployeeCreateDto } from './dtos/employee-create.dto';
import { EmployeeUpdateDto } from './dtos/employee-update.dto';
import { EmployeeDto } from './dtos/employee.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';

@Injectable()
export class EmployeesService {
    private readonly logger = new Logger(EmployeesService.name);

    constructor(private prisma: PrismaService) {}

    async createAsync(
        dto: EmployeeCreateDto,
        performerId: string,
    ): Promise<Result<EmployeeDto>> {
        // Validate unqiue checks (username, email, code)
        const check = await this.prisma.client.user.findFirst({
            where: {
                OR: [{ username: dto.username }, { email: dto.email }],
            },
            select: { id: true },
        });
        if (check) return Result.fail('Username or Email already exists');

        const codeCheck = await this.prisma.client.employee.findUnique({
            where: { employeeCode: dto.employeeCode },
            select: { id: true },
        });
        if (codeCheck) return Result.fail('Employee Code already exists');

        const defaultPassword = 'Employee123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const role = await this.prisma.client.role.findFirst({
            where: {
                name: dto.roleName.toUpperCase(),
                isDeleted: false,
                isActive: true,
            },
            select: { id: true },
        });
        this.logger.log('Role: ' + JSON.stringify(role));
        if (!role) return Result.fail('Role not found');

        try {
            const employee = await this.prisma.client.$transaction(
                async (tx) => {
                    // 1. Create User
                    const user = await tx.user.create({
                        data: {
                            username: dto.username,
                            email: dto.email,
                            password: hashedPassword,
                            userRoles: {
                                create: {
                                    roleId: role.id,
                                    performBy: performerId,
                                },
                            },
                        },
                    });

                    // 2. Create Employee Profile linked to user
                    return await tx.employee.create({
                        data: {
                            userId: user.id,
                            employeeCode: dto.employeeCode,
                            firstname: dto.firstname,
                            lastname: dto.lastname,
                            gender: dto.gender,
                            dob: new Date(dto.dob),
                            address: dto.address,
                            phone: dto.phone,
                            hireDate: new Date(dto.hireDate),
                            departmentId: dto.departmentId,
                            positionId: dto.positionId,
                            managerId: dto.managerId,
                            performBy: performerId,
                        },
                        include: {
                            department: true,
                            position: true,
                        },
                    });
                },
            );

            return Result.ok(plainToInstance(EmployeeDto, employee));
        } catch (e) {
            return Result.fail(
                e instanceof Error ? e.message : 'Transaction failed',
            );
        }
    }

    async findAllAsync(
        childIncluded?: boolean,
    ): Promise<Result<EmployeeDto[]>> {
        this.logger.log('Finding all employees');
        const employees = await this.prisma.client.employee.findMany({
            where: { isDeleted: false },
            include: {
                department: true,
                position: true,
                user: {
                    include: { userRoles: { include: { role: true } } },
                },
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: { role: true },
                              },
                          },
                      }
                    : false,
            },
            orderBy: { employeeCode: 'asc' },
        });
        return Result.ok(employees.map((e) => plainToInstance(EmployeeDto, e)));
    }

    async findAllPaginatedAsync(
        page: number,
        limit: number,
        childIncluded?: boolean,
    ): Promise<
        Result<{
            data: EmployeeDto[];
            meta: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrevious: boolean;
            };
        }>
    > {
        const skip = (page - 1) * limit;

        const [employees, total] = await this.prisma.$transaction([
            this.prisma.client.employee.findMany({
                where: { isDeleted: false },
                skip,
                take: limit,
                include: {
                    department: true,
                    position: true,
                    user: {
                        include: { userRoles: { include: { role: true } } },
                    },
                    performer: childIncluded
                        ? {
                              include: {
                                  userRoles: {
                                      include: { role: true },
                                  },
                              },
                          }
                        : false,
                },
                orderBy: { employeeCode: 'asc' },
            }),
            this.prisma.client.employee.count({ where: { isDeleted: false } }),
        ]);

        const data = employees.map((e) => plainToInstance(EmployeeDto, e));
        const totalPages = Math.ceil(total / limit);

        return Result.ok({
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNext: skip + limit < total,
                hasPrevious: skip > 0,
            },
        });
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<EmployeeDto>> {
        const employee = await this.prisma.client.employee.findFirst({
            where: { id },
            include: {
                department: true,
                position: true,
                user: { include: { userRoles: { include: { role: true } } } },
                manager: true,
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: { role: true },
                              },
                          },
                      }
                    : false,
            },
        });
        if (!employee) return Result.fail('Employee not found');
        return Result.ok(plainToInstance(EmployeeDto, employee));
    }

    async updateAsync(
        id: string,
        dto: EmployeeUpdateDto,
        performerId: string,
    ): Promise<Result<EmployeeDto>> {
        const employee = await this.prisma.client.employee.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!employee) return Result.fail('Employee not found');

        const updated = await this.prisma.client.employee.update({
            where: { id },
            data: {
                ...dto,
                performBy: performerId,
            },
            include: {
                department: true,
                position: true,
            },
        });

        return Result.ok(plainToInstance(EmployeeDto, updated));
    }

    async deleteAsync(id: string, performerId: string): Promise<Result<void>> {
        // Check if employee exists
        const check = await this.prisma.client.employee.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!check) return Result.fail('Employee not found');

        // Optional: Check dependencies (e.g. payrolls) before delete

        await this.prisma.client.employee.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performer: { connect: { id: performerId } },
            },
        });
        // Ideally we should also soft-delete the linked User, but that depends on requirements.
        return Result.ok();
    }
}

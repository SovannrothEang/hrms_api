import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { EmployeeCreateDto } from './dtos/employee-create.dto';
import { EmployeeUpdateDto } from './dtos/employee-update.dto';
import { EmployeeDto } from './dtos/employee.dto';
import { Result } from 'src/common/logic/result';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { EmployeeQueryDto } from './dtos/employee-query.dto';
import { CommonMapper } from 'src/common/mappers/common.mapper';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class EmployeesService {
    private readonly logger = new Logger(EmployeesService.name);

    constructor(private prisma: PrismaService) {}

    private async validateSalaryAgainstPosition(
        positionId: string,
        salary: number | undefined,
    ): Promise<Result<void>> {
        if (salary === undefined || salary === null) {
            return Result.ok();
        }

        const position = await this.prisma.client.employeePosition.findUnique({
            where: { id: positionId },
            select: {
                salaryRangeMin: true,
                salaryRangeMax: true,
                title: true,
            },
        });

        if (!position) {
            return Result.fail('Position not found');
        }

        const salaryDecimal = new Decimal(salary);

        if (salaryDecimal.lessThan(position.salaryRangeMin)) {
            return Result.fail(
                `Salary ${salary} is below minimum ${position.salaryRangeMin} for position "${position.title}"`,
            );
        }

        if (salaryDecimal.greaterThan(position.salaryRangeMax)) {
            return Result.fail(
                `Salary ${salary} is above maximum ${position.salaryRangeMax} for position "${position.title}"`,
            );
        }

        return Result.ok();
    }

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

        // Validate salary is within position range
        const salaryValidation = await this.validateSalaryAgainstPosition(
            dto.positionId,
            dto.salary,
        );
        if (!salaryValidation.isSuccess) {
            return Result.fail(salaryValidation.error ?? 'Invalid salary');
        }

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
                            hireDate: new Date(dto.hireDate).toISOString(),
                            departmentId: dto.departmentId,
                            positionId: dto.positionId,
                            managerId: dto.managerId,
                            employmentType:
                                (dto.employmentType as Prisma.EmployeeCreateInput['employmentType']) ??
                                'FULL_TIME',
                            status:
                                (dto.status as Prisma.EmployeeCreateInput['status']) ??
                                'ACTIVE',
                            salary: dto.salary,
                            emergencyContact:
                                dto.emergencyContact as Prisma.InputJsonValue,
                            bankDetails:
                                dto.bankDetails as Prisma.InputJsonValue,
                            performBy: performerId,
                        },
                        include: {
                            department: true,
                            position: true,
                        },
                    });
                },
            );

            return Result.ok(CommonMapper.mapToEmployeeDto(employee)!);
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
        return Result.ok(
            employees.map((e) => CommonMapper.mapToEmployeeDto(e)!),
        );
    }

    async findAllPaginatedAsync(
        query: EmployeeQueryDto,
    ): Promise<ResultPagination<EmployeeDto>> {
        this.logger.log('Getting paginated employees');
        const {
            page = 1,
            limit = 10,
            search,
            employeeCode,
            firstname,
            lastname,
            departmentId,
            department,
            positionId,
            employmentType,
            status,
            isActive,
            hireDateFrom,
            hireDateTo,
            salaryRange,
            gender,
            sortBy,
            sortOrder,
            includeDetails,
        } = query;

        const where: Prisma.EmployeeWhereInput = {
            isDeleted: false,
        };

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        if (search) {
            where.OR = [
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { firstname: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (employeeCode) {
            where.employeeCode = {
                contains: employeeCode,
                mode: 'insensitive',
            };
        }

        if (firstname) {
            where.firstname = {
                contains: firstname,
                mode: 'insensitive',
            };
        }

        if (lastname) {
            where.lastname = {
                contains: lastname,
                mode: 'insensitive',
            };
        }

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (department) {
            where.department = {
                departmentName: { contains: department, mode: 'insensitive' },
            };
        }

        if (positionId) {
            where.positionId = positionId;
        }

        if (employmentType) {
            where.employmentType =
                employmentType as Prisma.EmployeeCreateInput['employmentType'];
        }

        if (status) {
            where.status = status as Prisma.EmployeeCreateInput['status'];
        }

        if (hireDateFrom || hireDateTo) {
            where.hireDate = {};
            if (hireDateFrom) {
                where.hireDate.gte = new Date(hireDateFrom);
            }
            if (hireDateTo) {
                const end = new Date(hireDateTo);
                end.setHours(23, 59, 59, 999);
                where.hireDate.lte = end;
            }
        }

        if (salaryRange) {
            const min = query.salaryMin;
            const max = query.salaryMax;
            where.salary = {};
            if (min !== null) {
                where.salary.gte = min;
            }
            if (max !== null) {
                where.salary.lte = max;
            }
        }

        if (gender) {
            const genderMap: Record<string, number> = {
                male: 0,
                female: 1,
                unknown: 2,
            };
            where.gender = genderMap[gender] ?? 2;
        }

        const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
        if (sortBy === 'firstname') {
            orderBy.firstname = sortOrder;
        } else if (sortBy === 'lastname') {
            orderBy.lastname = sortOrder;
        } else if (sortBy === 'hireDate') {
            orderBy.hireDate = sortOrder;
        } else if (sortBy === 'salary') {
            orderBy.salary = sortOrder;
        } else if (sortBy === 'createdAt') {
            orderBy.createdAt = sortOrder;
        } else {
            orderBy.employeeCode = sortOrder;
        }

        const include = {
            department: includeDetails,
            position: includeDetails,
            user: {
                include: { userRoles: { include: { role: true } } },
            },
            performer: includeDetails
                ? {
                      include: {
                          userRoles: {
                              include: { role: true },
                          },
                      },
                  }
                : false,
        };

        this.logger.log(`Query: ${JSON.stringify(query)}`);
        try {
            const [total, employees] = await Promise.all([
                this.prisma.client.employee.count({ where }),
                this.prisma.client.employee.findMany({
                    where,
                    skip: query.skip,
                    take: limit,
                    include,
                    orderBy,
                }),
            ]);

            const data = employees.map(
                (e) => CommonMapper.mapToEmployeeDto(e)!,
            );

            return ResultPagination.of(data, total, page, limit);
        } catch (error) {
            this.logger.error('Failed to fetch paginated employees', error);
            throw error;
        }
    }

    async findAllFilteredAsync(
        query: EmployeeQueryDto,
    ): Promise<Result<ResultPagination<EmployeeDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return Result.ok(paginationResult);
        } catch (error) {
            this.logger.error('Failed to fetch filtered employees', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
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
        return Result.ok(CommonMapper.mapToEmployeeDto(employee)!);
    }

    async updateAsync(
        id: string,
        dto: EmployeeUpdateDto,
        performerId: string,
    ): Promise<Result<EmployeeDto>> {
        const employee = await this.prisma.client.employee.findFirst({
            where: { id },
            select: {
                id: true,
                userId: true,
                positionId: true,
                salary: true,
                user: { select: { profileImage: true } },
            },
        });
        if (!employee) return Result.fail('Employee not found');

        // Determine which position to validate against
        const positionIdToValidate = dto.positionId ?? employee.positionId;
        const salaryToValidate = dto.salary ?? Number(employee.salary);

        // Validate salary if it's being updated or position is changing
        if (dto.salary !== undefined || dto.positionId !== undefined) {
            const salaryValidation = await this.validateSalaryAgainstPosition(
                positionIdToValidate,
                salaryToValidate,
            );
            if (!salaryValidation.isSuccess) {
                return Result.fail(
                    salaryValidation.error ?? 'Invalid salary for position',
                );
            }
        }

        const {
            employmentType,
            status,
            emergencyContact,
            bankDetails,
            ...rest
        } = dto;

        const updated = await this.prisma.client.employee.update({
            where: { id },
            data: {
                ...rest,
                ...(employmentType && {
                    employmentType:
                        employmentType as Prisma.EmployeeUpdateInput['employmentType'],
                }),
                ...(status && {
                    status: status as Prisma.EmployeeUpdateInput['status'],
                }),
                ...(emergencyContact !== undefined && {
                    emergencyContact: emergencyContact as Prisma.InputJsonValue,
                }),
                ...(bankDetails !== undefined && {
                    bankDetails: bankDetails as Prisma.InputJsonValue,
                }),
                performBy: performerId,
            },
            include: {
                department: true,
                position: true,
                user: true,
            },
        });

        return Result.ok(CommonMapper.mapToEmployeeDto(updated)!);
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

    async getSummaryAsync(): Promise<{
        totalEmployees: number;
        activeCount: number;
        inactiveCount: number;
        newThisMonth: number;
    }> {
        const now = new Date();
        const startOfMonth = new Date(
            Date.UTC(now.getFullYear(), now.getMonth(), 1),
        );

        const [totalEmployees, activeCount, inactiveCount, newThisMonth] =
            await Promise.all([
                this.prisma.client.employee.count({
                    where: { isDeleted: false },
                }),
                this.prisma.client.employee.count({
                    where: { isDeleted: false, isActive: true },
                }),
                this.prisma.client.employee.count({
                    where: { isDeleted: false, isActive: false },
                }),
                this.prisma.client.employee.count({
                    where: {
                        hireDate: { gte: startOfMonth },
                        isDeleted: false,
                    },
                }),
            ]);

        return {
            totalEmployees,
            activeCount,
            inactiveCount,
            newThisMonth,
        };
    }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { EmployeeCreateDto } from './dtos/employee-create.dto';
import { EmployeeUpdateDto } from './dtos/employee-update.dto';
import { EmployeeDto } from './dtos/employee.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
    constructor(private prisma: PrismaService) { }

    async createAsync(
        dto: EmployeeCreateDto,
        performerId: string,
    ): Promise<Result<EmployeeDto>> {
        // Validate unqiue checks (username, email, code)
        const check = await this.prisma.user.findFirst({
            where: {
                OR: [{ username: dto.username }, { email: dto.email }],
            },
            select: { id: true }
        });
        if (check) return Result.fail('Username or Email already exists');

        const codeCheck = await this.prisma.employee.findUnique({
            where: { employeeCode: dto.employeeCode },
            select: { id: true }
        });
        if (codeCheck) return Result.fail('Employee Code already exists');

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const role = await this.prisma.role.findFirst({
            where: { name: dto.roleName },
            select: { id: true }
        });
        if (!role) return Result.fail('Role not found');

        try {
            const employee = await this.prisma.$transaction(async (tx) => {
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
            });

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
        const employees = await this.prisma.employee.findMany({
            include: {
                department: true,
                position: true,
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
        return Result.ok(employees.map((e) => plainToInstance(EmployeeDto, e)));
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<EmployeeDto>> {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                position: true,
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
        const employee = await this.prisma.employee.findUnique({
            where: { id },
        });
        if (!employee) return Result.fail('Employee not found');

        const updated = await this.prisma.employee.update({
            where: { id },
            data: {
                firstname: dto.firstname,
                lastname: dto.lastname,
                gender: dto.gender,
                dob: dto.dob ? new Date(dto.dob) : undefined,
                address: dto.address,
                phone: dto.phone,
                hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
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

        return Result.ok(plainToInstance(EmployeeDto, updated));
    }

    async deleteAsync(id: string): Promise<Result<void>> {
        // Check if employee exists
        const check = await this.prisma.employee.findUnique({ where: { id } });
        if (!check) return Result.fail('Employee not found');

        // Optional: Check dependencies (e.g. payrolls) before delete

        await this.prisma.employee.delete({ where: { id } });
        // Ideally we should also soft-delete the linked User, but that depends on requirements.
        return Result.ok();
    }
}

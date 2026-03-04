import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { Result } from '../../common/logic/result';
import { ResultPagination } from '../../common/logic/result-pagination';
import {
    LeaveBalanceCreateDto,
    LeaveBalanceUpdateDto,
    LeaveBalanceResponseDto,
    EmployeeLeaveBalanceResponseDto,
    LeaveBalanceBulkCreateDto,
} from './dtos/leave-balance.dto';
import { LeaveBalanceQueryDto } from './dtos/leave-balance-query.dto';
import { LeaveType } from '../../common/enums/leave-type.enum';

@Injectable()
export class LeaveBalancesService {
    private readonly logger = new Logger(LeaveBalancesService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Initialize default leave balances for a new employee
     */
    async initializeDefaultBalances(
        employeeId: string,
        performerId: string,
        year?: number,
    ): Promise<Result<void>> {
        const targetYear = year || new Date().getFullYear();

        // Default leave balances - can be configured
        const defaultBalances: Record<string, number> = {
            [LeaveType.ANNUAL_LEAVE]: 15,
            [LeaveType.SICK_LEAVE]: 10,
            [LeaveType.CASUAL_LEAVE]: 5,
            [LeaveType.BEREAVEMENT_LEAVE]: 3,
            [LeaveType.FAMILY_MEDICAL_LEAVE]: 5,
            [LeaveType.MENTAL_HEALTH_DAYS]: 2,
        };

        try {
            await this.prisma.client.$transaction(async (tx) => {
                for (const [leaveType, totalDays] of Object.entries(
                    defaultBalances,
                )) {
                    await tx.leaveBalance.upsert({
                        where: {
                            employeeId_leaveType_year: {
                                employeeId,
                                leaveType,
                                year: targetYear,
                            },
                        },
                        update: {},
                        create: {
                            employeeId,
                            leaveType,
                            year: targetYear,
                            totalDays,
                            usedDays: 0,
                            pendingDays: 0,
                            performBy: performerId,
                            isActive: true,
                            isDeleted: false,
                        },
                    });
                }
            });

            this.logger.log(
                `Initialized leave balances for employee ${employeeId}`,
            );
            return Result.ok();
        } catch (error) {
            this.logger.error('Failed to initialize leave balances', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to initialize leave balances',
            );
        }
    }

    /**
     * Create a single leave balance
     */
    async createAsync(
        dto: LeaveBalanceCreateDto,
        performerId: string,
    ): Promise<Result<LeaveBalanceResponseDto>> {
        try {
            const balance = await this.prisma.client.leaveBalance.create({
                data: {
                    employeeId: dto.employeeId,
                    leaveType: dto.leaveType,
                    year: dto.year,
                    totalDays: dto.totalDays,
                    usedDays: 0,
                    pendingDays: 0,
                    performBy: performerId,
                    isActive: true,
                    isDeleted: false,
                },
            });

            return Result.ok(this.mapToResponseDto(balance));
        } catch (error) {
            this.logger.error('Failed to create leave balance', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to create leave balance',
            );
        }
    }

    /**
     * Create multiple leave balances in bulk
     */
    async createBulkAsync(
        dto: LeaveBalanceBulkCreateDto,
        performerId: string,
    ): Promise<Result<LeaveBalanceResponseDto[]>> {
        try {
            const balances: LeaveBalanceResponseDto[] = [];

            await this.prisma.client.$transaction(async (tx) => {
                for (const [leaveType, totalDays] of Object.entries(
                    dto.balances,
                )) {
                    const balance = await tx.leaveBalance.upsert({
                        where: {
                            employeeId_leaveType_year: {
                                employeeId: dto.employeeId,
                                leaveType,
                                year: dto.year,
                            },
                        },
                        update: {
                            totalDays,
                            performBy: performerId,
                        },
                        create: {
                            employeeId: dto.employeeId,
                            leaveType,
                            year: dto.year,
                            totalDays,
                            usedDays: 0,
                            pendingDays: 0,
                            performBy: performerId,
                            isActive: true,
                            isDeleted: false,
                        },
                    });
                    balances.push(this.mapToResponseDto(balance));
                }
            });

            return Result.ok(balances);
        } catch (error) {
            this.logger.error('Failed to create bulk leave balances', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to create leave balances',
            );
        }
    }

    /**
     * Find all leave balances with pagination
     */
    async findAllAsync(
        query: LeaveBalanceQueryDto,
    ): Promise<Result<ResultPagination<LeaveBalanceResponseDto>>> {
        try {
            const where: any = {
                isDeleted: false,
            };

            if (query.employeeId) {
                where.employeeId = query.employeeId;
            }

            if (query.year) {
                where.year = query.year;
            }

            if (query.leaveType) {
                where.leaveType = query.leaveType;
            }

            const [total, balances] = await Promise.all([
                this.prisma.client.leaveBalance.count({ where }),
                this.prisma.client.leaveBalance.findMany({
                    where,
                    skip: query.skip,
                    take: query.limit || 10,
                    orderBy: [
                        { employeeId: 'asc' },
                        { year: 'desc' },
                        { leaveType: 'asc' },
                    ],
                }),
            ]);

            const data = balances.map((balance) =>
                this.mapToResponseDto(balance),
            );

            return Result.ok(
                ResultPagination.of(
                    data,
                    total,
                    query.page || 1,
                    query.limit || 10,
                ),
            );
        } catch (error) {
            this.logger.error('Failed to fetch leave balances', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to fetch leave balances',
            );
        }
    }

    /**
     * Get leave balances for a specific employee
     */
    async findByEmployeeAsync(
        employeeId: string,
        year?: number,
    ): Promise<Result<EmployeeLeaveBalanceResponseDto>> {
        const targetYear = year || new Date().getFullYear();

        const employee = await this.prisma.client.employee.findFirst({
            where: { id: employeeId, isDeleted: false },
        });

        if (!employee) {
            return Result.fail('Employee not found');
        }

        const balances = await this.prisma.client.leaveBalance.findMany({
            where: {
                employeeId,
                year: targetYear,
                isDeleted: false,
            },
            orderBy: { leaveType: 'asc' },
        });

        const balanceDtos = balances.map((balance) =>
            this.mapToResponseDto(balance),
        );

        return Result.ok({
            employeeId,
            employeeName: `${employee.firstname} ${employee.lastname}`,
            balances: balanceDtos,
            year: targetYear,
        });
    }

    /**
     * Update a leave balance
     */
    async updateAsync(
        id: string,
        dto: LeaveBalanceUpdateDto,
        performerId: string,
    ): Promise<Result<LeaveBalanceResponseDto>> {
        try {
            const existing = await this.prisma.client.leaveBalance.findFirst({
                where: { id, isDeleted: false },
            });

            if (!existing) {
                return Result.fail('Leave balance not found');
            }

            const balance = await this.prisma.client.leaveBalance.update({
                where: { id },
                data: {
                    totalDays: dto.totalDays,
                    performBy: performerId,
                },
            });

            return Result.ok(this.mapToResponseDto(balance));
        } catch (error) {
            this.logger.error('Failed to update leave balance', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to update leave balance',
            );
        }
    }

    /**
     * Delete a leave balance (soft delete)
     */
    async deleteAsync(id: string, performerId: string): Promise<Result<void>> {
        try {
            const existing = await this.prisma.client.leaveBalance.findFirst({
                where: { id, isDeleted: false },
            });

            if (!existing) {
                return Result.fail('Leave balance not found');
            }

            await this.prisma.client.leaveBalance.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    performBy: performerId,
                },
            });

            return Result.ok();
        } catch (error) {
            this.logger.error('Failed to delete leave balance', error);
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete leave balance',
            );
        }
    }

    /**
     * Map Prisma leave balance to response DTO
     */
    private mapToResponseDto(balance: any): LeaveBalanceResponseDto {
        const availableDays =
            Number(balance.totalDays) -
            Number(balance.usedDays) -
            Number(balance.pendingDays);

        return {
            id: balance.id,
            employeeId: balance.employeeId,
            leaveType: balance.leaveType,
            year: balance.year,
            totalDays: Number(balance.totalDays),
            usedDays: Number(balance.usedDays),
            pendingDays: Number(balance.pendingDays),
            availableDays,
            createdAt: balance.createdAt,
            updatedAt: balance.updatedAt,
        };
    }
}

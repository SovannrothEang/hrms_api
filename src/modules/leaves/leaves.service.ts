import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/logic/result';
import { LeaveRequestDto } from './dtos/leave-request.dto';
import { LeaveRequestCreateDto } from './dtos/leave-request-create.dto';
import { LeaveRequestStatusUpdateDto } from './dtos/leave-request-status-update.dto';
import { LeaveQueryDto } from './dtos/leave-query.dto';
import { plainToInstance } from 'class-transformer';
import { LeaveStatus } from 'src/common/enums/leave-status.enum';
import { ResultPagination } from '../../common/logic/result-pagination';
import { MeLeaveBalanceResponseDto } from './dtos/me-leave-balance-response.dto';
import {
    MeLeaveRequestResponseDto,
    MeLeaveRequestSummaryDto,
} from './dtos/me-leave-request-response.dto';

import { EmailService } from '../notifications/email.service';

@Injectable()
export class LeavesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) {}

    async findAllAsync(
        childIncluded: boolean = false,
    ): Promise<Result<LeaveRequestDto[]>> {
        const leaves = await this.prisma.client.leaveRequest.findMany({
            include: {
                requester: { include: { department: true } },
                approver: childIncluded ? true : false,
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
        return Result.ok(
            leaves.map((l) => plainToInstance(LeaveRequestDto, l)),
        );
    }

    async findAllPaginatedAsync(
        query: LeaveQueryDto,
    ): Promise<Result<ResultPagination<LeaveRequestDto>>> {
        const {
            page = 1,
            limit = 10,
            employeeId,
            approverId,
            leaveType,
            status,
            dateFrom,
            dateTo,
            childIncluded = false,
            sortBy = 'startDate',
            sortOrder = 'desc',
            skip,
        } = query;

        const whereClause: Prisma.LeaveRequestWhereInput = { isDeleted: false };

        if (employeeId) whereClause.employeeId = employeeId;
        if (approverId) whereClause.approvedBy = approverId;
        if (leaveType) whereClause.leaveType = leaveType;
        if (status) whereClause.status = status;

        if (dateFrom || dateTo) {
            const dateFilter: Prisma.DateTimeFilter = {};
            if (dateFrom) dateFilter.gte = new Date(dateFrom);
            if (dateTo) dateFilter.lte = new Date(dateTo);
            whereClause.startDate = dateFilter;
        }

        const orderBy: Prisma.LeaveRequestOrderByWithRelationInput = {};
        if (sortBy === 'startDate') orderBy.startDate = sortOrder;
        else if (sortBy === 'endDate') orderBy.endDate = sortOrder;
        else if (sortBy === 'requestDate') orderBy.requestDate = sortOrder;
        else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

        const [total, leaves] = await Promise.all([
            this.prisma.client.leaveRequest.count({ where: whereClause }),
            this.prisma.client.leaveRequest.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy,
                include: {
                    requester: { include: { department: true } },
                    approver: childIncluded ? true : false,
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
            }),
        ]);

        const dtos = leaves.map((l) => plainToInstance(LeaveRequestDto, l));
        return Result.ok(ResultPagination.of(dtos, total, page, limit));
    }

    async findAllFilteredAsync(
        query: LeaveQueryDto,
    ): Promise<Result<ResultPagination<LeaveRequestDto>>> {
        try {
            const paginationResult = await this.findAllPaginatedAsync(query);
            return paginationResult;
        } catch (error) {
            return Result.fail(
                error instanceof Error
                    ? error.message
                    : 'Internal server error',
            );
        }
    }

    async findOneByIdAsync(
        id: string,
        childIncluded: boolean = false,
    ): Promise<Result<LeaveRequestDto>> {
        const leave = await this.prisma.client.leaveRequest.findFirst({
            where: { id },
            include: {
                requester: { include: { department: true } },
                approver: childIncluded ? true : false,
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
        if (!leave) return Result.fail('Leave request not found');
        return Result.ok(plainToInstance(LeaveRequestDto, leave));
    }

    async createAsync(
        dto: LeaveRequestCreateDto,
        performerId?: string,
    ): Promise<Result<LeaveRequestDto>> {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        // Date validation
        if (endDate < startDate) {
            return Result.fail('End date must be on or after start date');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate < today) {
            return Result.fail('Start date cannot be in the past');
        }

        const year = startDate.getFullYear();

        // 1. Check overlap
        const overlaps = await this.prisma.client.leaveRequest.findFirst({
            where: {
                employeeId: dto.employeeId,
                status: { not: LeaveStatus.REJECTED },
                OR: [
                    {
                        startDate: { lte: dto.endDate },
                        endDate: { gte: dto.startDate },
                    },
                ],
            },
        });

        if (overlaps) {
            return Result.fail(
                'Leave request overlaps with an existing request.',
            );
        }

        // 2. Calculate requested days (Simple day diff for now)
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 3. Transaction: Check Balance & Create Request
        try {
            const leave = await this.prisma.client.$transaction(async (tx) => {
                // Find or Create Balance Record
                let balance = await tx.leaveBalance.findUnique({
                    where: {
                        employeeId_leaveType_year: {
                            employeeId: dto.employeeId,
                            leaveType: dto.leaveType,
                            year: year,
                        },
                    },
                });

                // Check sufficiency
                if (balance) {
                    const available =
                        Number(balance.totalDays) -
                        Number(balance.usedDays) -
                        Number(balance.pendingDays);

                    if (available < requestedDays) {
                        throw new Error(
                            `Insufficient leave balance. Available: ${available}, Requested: ${requestedDays}`,
                        );
                    }

                    // Update Pending Balance
                    await tx.leaveBalance.update({
                        where: { id: balance.id },
                        data: {
                            pendingDays: { increment: requestedDays },
                        },
                    });
                } else {
                    // For MVP/Transition: If no balance record exists, we might want to fail OR allow (creating a negative/tracking record).
                    // Let's create a 0-based record which will effectively act as "unpaid" or tracked but not strictly limited if we didn't seed balances.
                    // But strictly speaking, we should fail or auto-create. Let's auto-create with 0 total for now to track usage.
                    balance = await tx.leaveBalance.create({
                        data: {
                            employeeId: dto.employeeId,
                            leaveType: dto.leaveType,
                            year: year,
                            totalDays: 0, // Or some default
                            pendingDays: requestedDays,
                        },
                    });
                    // Optional: If we want to enforcing strict 0 limit -> verify negative?
                    // For now, let's assume if it didn't exist, we track it.
                }

                return await tx.leaveRequest.create({
                    data: {
                        ...dto,
                        startDate: startDate,
                        endDate: endDate,
                        status: LeaveStatus.PENDING,
                        performBy: performerId,
                    },
                    include: { requester: { include: { department: true } } },
                });
            });

            // Notify Manager (MVP: Finding manager of employee)
            // For now, imply sending to a generic HR or the employee's manager if relation exists
            // We can just call the service and let it mock
            this.emailService.sendLeaveRequestNotification(
                'manager@company.com',
                leave.id,
            );

            return Result.ok(plainToInstance(LeaveRequestDto, leave));
        } catch (e) {
            return Result.fail(
                e instanceof Error
                    ? e.message
                    : 'Failed to create leave request',
            );
        }
    }

    async updateStatusAsync(
        id: string,
        dto: LeaveRequestStatusUpdateDto,
        performerId?: string,
    ): Promise<Result<LeaveRequestDto>> {
        const leave = await this.prisma.client.leaveRequest.findUnique({
            where: { id },
        });

        if (!leave) return Result.fail('Leave request not found');
        if (leave.status !== (LeaveStatus.PENDING as any)) {
            return Result.fail(
                `Cannot update status from ${leave.status}. Only PENDING requests can be processed.`,
            );
        }

        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const year = startDate.getFullYear(); // Assuming simple single-year requests for MVP
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        try {
            const updatedLeave = await this.prisma.client.$transaction(
                async (tx) => {
                    // Update Balance based on Decision
                    if (dto.status === (LeaveStatus.APPROVED as any)) {
                        // Move from Pending to Used
                        await tx.leaveBalance.updateMany({
                            where: {
                                employeeId: leave.employeeId,
                                leaveType: leave.leaveType,
                                year: year,
                            },
                            data: {
                                pendingDays: { decrement: requestedDays },
                                usedDays: { increment: requestedDays },
                            },
                        });
                    } else if (dto.status === (LeaveStatus.REJECTED as any)) {
                        // Return from Pending (free up)
                        await tx.leaveBalance.updateMany({
                            where: {
                                employeeId: leave.employeeId,
                                leaveType: leave.leaveType,
                                year: year,
                            },
                            data: {
                                pendingDays: { decrement: requestedDays },
                            },
                        });
                    }

                    return await tx.leaveRequest.update({
                        where: { id },
                        data: {
                            status: dto.status,
                            approvedBy: dto.approverId,
                            performBy: performerId,
                        },
                        include: {
                            requester: { include: { department: true } },
                            approver: true,
                        },
                    });
                },
            );

            // Notify Employee of decision
            this.emailService.sendLeaveStatusUpdateNotification(
                'employee@company.com', // In real app: leave.requester.email
                id,
                dto.status,
            );

            return Result.ok(plainToInstance(LeaveRequestDto, updatedLeave));
        } catch (e) {
            return Result.fail(
                e instanceof Error ? e.message : 'Transaction failed',
            );
        }
    }

    async deleteAsync(id: string): Promise<Result<void>> {
        const leave = await this.prisma.client.leaveRequest.findUnique({
            where: { id },
        });

        if (!leave) return Result.fail('Leave request not found');
        if (leave.status !== (LeaveStatus.PENDING as any))
            return Result.fail('Cannot delete processed leave request');

        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const year = startDate.getFullYear();
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        try {
            await this.prisma.client.$transaction(async (tx) => {
                // Restore Pending Balance
                await tx.leaveBalance.updateMany({
                    where: {
                        employeeId: leave.employeeId,
                        leaveType: leave.leaveType,
                        year: year,
                    },
                    data: {
                        pendingDays: { decrement: requestedDays },
                    },
                });

                await tx.leaveRequest.delete({ where: { id } });
            });
            return Result.ok();
        } catch (e) {
            return Result.fail(
                e instanceof Error ? e.message : 'Transaction failed',
            );
        }
    }

    async getMyLeaveBalancesAsync(
        userId: string,
        year?: number,
    ): Promise<Result<MeLeaveBalanceResponseDto>> {
        const targetYear = year ?? new Date().getFullYear();

        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) {
            return Result.fail('Employee record not found for user');
        }

        const balances = await this.prisma.client.leaveBalance.findMany({
            where: {
                employeeId: employee.id,
                year: targetYear,
                isDeleted: false,
            },
            orderBy: { leaveType: 'asc' },
        });

        const balanceItems = balances.map((balance) => {
            const availableDays =
                Number(balance.totalDays) -
                Number(balance.usedDays) -
                Number(balance.pendingDays);

            return {
                id: balance.id,
                leave_type: balance.leaveType,
                year: balance.year,
                total_days: Number(balance.totalDays),
                used_days: Number(balance.usedDays),
                pending_days: Number(balance.pendingDays),
                available_days: availableDays,
            };
        });

        return Result.ok({
            balances: balanceItems,
            year: targetYear,
        });
    }

    async getMyLeaveRequestsAsync(
        userId: string,
        query: LeaveQueryDto,
    ): Promise<Result<MeLeaveRequestResponseDto>> {
        const {
            page = 1,
            limit = 10,
            status,
            dateFrom,
            dateTo,
            sortBy = 'startDate',
            sortOrder = 'desc',
        } = query;

        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) {
            return Result.fail('Employee record not found for user');
        }

        const whereClause: Prisma.LeaveRequestWhereInput = {
            employeeId: employee.id,
            isDeleted: false,
        };

        if (status) whereClause.status = status;

        if (dateFrom || dateTo) {
            const dateFilter: Prisma.DateTimeFilter = {};
            if (dateFrom) dateFilter.gte = new Date(dateFrom);
            if (dateTo) dateFilter.lte = new Date(dateTo);
            whereClause.startDate = dateFilter;
        }

        const orderBy: Prisma.LeaveRequestOrderByWithRelationInput = {};
        if (sortBy === 'startDate') orderBy.startDate = sortOrder;
        else if (sortBy === 'endDate') orderBy.endDate = sortOrder;
        else if (sortBy === 'requestDate') orderBy.requestDate = sortOrder;
        else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

        const [total, leaveRequests] = await Promise.all([
            this.prisma.client.leaveRequest.count({ where: whereClause }),
            this.prisma.client.leaveRequest.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                orderBy,
                include: {
                    approver: {
                        select: { id: true, firstname: true, lastname: true },
                    },
                },
            }),
        ]);

        const statusCounts = await this.prisma.client.leaveRequest.groupBy({
            by: ['status'],
            where: { employeeId: employee.id, isDeleted: false },
            _count: { _all: true },
        });

        const getCount = (s: string) =>
            statusCounts.find((c) => c.status === s)?._count._all || 0;

        const summary: MeLeaveRequestSummaryDto = {
            total_requests: total,
            pending_count: getCount('PENDING'),
            approved_count: getCount('APPROVED'),
            rejected_count: getCount('REJECTED'),
        };

        const records = leaveRequests.map((leave) => {
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            return {
                id: leave.id,
                leave_type: leave.leaveType,
                start_date: leave.startDate.toISOString().split('T')[0],
                end_date: leave.endDate.toISOString().split('T')[0],
                total_days: totalDays,
                reason: leave.reason,
                status: leave.status,
                request_date: leave.requestDate.toISOString(),
                approved_by: leave.approver
                    ? `${leave.approver.firstname} ${leave.approver.lastname}`
                    : null,
            };
        });

        const pagination = {
            page,
            limit,
            total,
            has_more: page * limit < total,
        };

        return Result.ok({
            records,
            summary,
            pagination,
        });
    }

    async getMyLeaveRequestByIdAsync(
        userId: string,
        leaveRequestId: string,
    ): Promise<Result<LeaveRequestDto>> {
        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) {
            return Result.fail('Employee record not found for user');
        }

        const leaveRequest = await this.prisma.client.leaveRequest.findFirst({
            where: {
                id: leaveRequestId,
                employeeId: employee.id,
                isDeleted: false,
            },
            include: {
                requester: { include: { department: true } },
                approver: true,
            },
        });

        if (!leaveRequest) {
            return Result.fail('Leave request not found or access denied');
        }

        return Result.ok(plainToInstance(LeaveRequestDto, leaveRequest));
    }
}

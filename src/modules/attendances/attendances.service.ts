import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { CommonMapper } from 'src/common/mappers/common.mapper';
import { Prisma } from '@prisma/client';
import { AttendanceDto } from './dtos/attendance.dto';
import { AttendanceQueryDto } from './dtos/attendance-query.dto';
import { Result } from 'src/common/logic/result';
import { AttendanceStatus } from 'src/common/enums/attendance-status.enum';
import { RoleName } from 'src/common/enums/roles.enum';

import { ResultPagination } from '../../common/logic/result-pagination';
import {
    MeAttendancePaginationDto,
    MeAttendanceRecordDto,
    MeAttendanceResponseDto,
    MeAttendanceSummaryDto,
} from './dtos/me-attendance-response.dto';
import { QrManagerService } from './services/qr-manager.service';
import { CheckInDto } from './dtos/check-in.dto';
import { CheckOutDto } from './dtos/check-out.dto';
import { AttendanceSummaryDto } from './dtos/attendance-summary.dto';

@Injectable()
export class AttendancesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly qrManagerService: QrManagerService,
    ) {}

    async findAllAsync(
        childIncluded?: boolean,
    ): Promise<Result<AttendanceDto[]>> {
        const attendances = await this.prisma.client.attendance.findMany({
            where: { isDeleted: false },
            include: {
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: { role: true },
                              },
                          },
                      }
                    : false,
                employee: childIncluded
                    ? {
                          include: {
                              department: true,
                              position: true,
                              user: { select: { profileImage: true } },
                          },
                      }
                    : false,
            },
        });
        return Result.ok(
            attendances.map((a) => CommonMapper.mapToAttendanceDto(a)!),
        );
    }

    async findAllFilteredAsync(
        query: AttendanceQueryDto,
    ): Promise<Result<ResultPagination<AttendanceDto, AttendanceSummaryDto>>> {
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

    async findAllPaginatedAsync(
        query: AttendanceQueryDto,
    ): Promise<Result<ResultPagination<AttendanceDto, AttendanceSummaryDto>>> {
        const {
            page = 1,
            limit = 10,
            employeeId,
            dateFrom,
            dateTo,
            status,
            childIncluded = false,
            sortBy = 'date',
            sortOrder = 'desc',
        } = query;

        const skip = query.skip;

        const where: Prisma.AttendanceWhereInput = { isDeleted: false };

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (status) {
            where.status = status;
        }

        if (dateFrom || dateTo) {
            const dateFilter: Prisma.DateTimeFilter = {};
            if (dateFrom) {
                dateFilter.gte = new Date(dateFrom);
            }
            if (dateTo) {
                dateFilter.lte = new Date(dateTo);
            }
            where.date = dateFilter;
        }

        const orderBy: Prisma.AttendanceOrderByWithRelationInput = {};
        if (sortBy === 'date') {
            orderBy.date = sortOrder;
        } else if (sortBy === 'checkInTime') {
            orderBy.checkInTime = sortOrder;
        } else if (sortBy === 'createdAt') {
            orderBy.createdAt = sortOrder;
        }

        const [attendances, total, aggregates, statusCounts] =
            await this.prisma.$transaction([
                this.prisma.client.attendance.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        performer: childIncluded
                            ? {
                                  include: {
                                      userRoles: {
                                          include: { role: true },
                                      },
                                  },
                              }
                            : false,
                        employee: childIncluded
                            ? {
                                  include: {
                                      department: true,
                                      position: true,
                                  },
                              }
                            : false,
                    },
                    orderBy,
                }),
                this.prisma.client.attendance.count({ where }),
                this.prisma.client.attendance.aggregate({
                    where,
                    _sum: { workHours: true, overtime: true },
                }),
                this.prisma.client.attendance.groupBy({
                    by: ['status'],
                    where,
                    orderBy: { status: 'asc' },
                    _count: { _all: true },
                }),
            ]);

        type StatusCountResult = {
            status: string;
            _count: { _all: number };
        };

        const getCount = (s: string): number => {
            const found = (statusCounts as StatusCountResult[]).find(
                (c) => c.status === s,
            );
            return found?._count._all || 0;
        };

        const summary: AttendanceSummaryDto = {
            daysPresent:
                getCount(AttendanceStatus.PRESENT) +
                getCount(AttendanceStatus.LATE) +
                getCount(AttendanceStatus.EARLY_OUT),
            lateCount: getCount(AttendanceStatus.LATE),
            daysAbsent: getCount(AttendanceStatus.ABSENT),
            daysOnLeave: getCount(AttendanceStatus.ON_LEAVE),
            totalHoursWorked: Number(aggregates._sum.workHours || 0),
            totalOvertimeHours: Number(aggregates._sum.overtime || 0),
        };

        const data = attendances.map(
            (a) => CommonMapper.mapToAttendanceDto(a)!,
        );
        return Result.ok(
            ResultPagination.of(data, total, page, limit, summary),
        );
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<AttendanceDto>> {
        const attendance = await this.prisma.client.attendance.findFirst({
            where: { id },
            include: {
                performer: childIncluded
                    ? {
                          include: {
                              userRoles: {
                                  include: { role: true },
                              },
                          },
                      }
                    : false,
                employee: childIncluded
                    ? {
                          include: {
                              department: true,
                              position: true,
                              user: { select: { profileImage: true } },
                          },
                      }
                    : false,
            },
        });
        if (!attendance) return Result.fail('Attendance not found');
        return Result.ok(CommonMapper.mapToAttendanceDto(attendance)!);
    }

    async getTodayAttendance(
        userId: string,
    ): Promise<Result<AttendanceDto | null>> {
        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) return Result.fail('Employee record not found');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.client.attendance.findFirst({
            where: {
                employeeId: employee.id,
                date: today,
                isDeleted: false,
            },
            include: {
                employee: {
                    include: {
                        user: { select: { profileImage: true } },
                    },
                },
            },
        });

        if (!attendance) return Result.ok(null);
        return Result.ok(CommonMapper.mapToAttendanceDto(attendance));
    }

    async checkIn(
        dto: CheckInDto,
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        let { employeeId, qrToken } = dto;

        if (!employeeId && performerId) {
            const emp = await this.prisma.client.employee.findFirst({
                where: { userId: performerId },
            });
            if (emp) employeeId = emp.id;
        }

        if (!employeeId) return Result.fail('Employee ID is required');

        // Verify QR Token or Check Performer Permissions
        if (qrToken) {
            await this.qrManagerService.verifyToken(qrToken, 'IN');
        } else if (performerId) {
            const performer = await this.prisma.client.user.findUnique({
                where: { id: performerId },
                include: { userRoles: { include: { role: true } } },
            });
            const roles = performer?.userRoles.map((ur) => ur.role.name) || [];
            if (
                !roles.includes(RoleName.ADMIN) &&
                !roles.includes(RoleName.HR_MANAGER)
            ) {
                return Result.fail(
                    'Manual clock-in requires Admin or HR roles.',
                );
            }
        } else {
            return Result.fail('QR token or manual authorization required.');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance =
            await this.prisma.client.attendance.findFirst({
                where: {
                    employeeId: employeeId,
                    date: today,
                    isDeleted: false,
                },
            });

        if (existingAttendance && existingAttendance.checkInTime) {
            return Result.fail('Employee has already checked in for today.');
        }

        // Fetch employee to get shift details
        const employee = await this.prisma.client.employee.findFirst({
            where: { id: employeeId },
            include: { shift: true },
        });

        if (!employee) return Result.fail('Employee not found');

        const now = new Date();
        let status = AttendanceStatus.PRESENT;

        if (employee.shift) {
            const shiftStart = new Date(employee.shift.startTime); // 1970-01-01T09:00:00.000Z generally

            // Construct today's expected start time in UTC
            const expectedStart = new Date(now);
            expectedStart.setUTCHours(
                shiftStart.getUTCHours(),
                shiftStart.getUTCMinutes(),
                0,
                0,
            );

            const graceMinutes = employee.shift.gracePeriodMins || 0;
            expectedStart.setUTCMinutes(
                expectedStart.getUTCMinutes() + graceMinutes,
            );

            if (now > expectedStart) {
                status = AttendanceStatus.LATE;
            }
        } else {
            // Default fallback if no shift assigned (9 AM UTC)
            const startWorkTime = new Date(now);
            startWorkTime.setUTCHours(9, 0, 0, 0);
            if (now > startWorkTime) status = AttendanceStatus.LATE;
        }

        let attendance;
        if (existingAttendance) {
            // Update existing record (e.g. if it was marked as ABSENT)
            attendance = await this.prisma.client.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    checkInTime: now,
                    status: status,
                    performBy: performerId,
                },
                include: {
                    employee: {
                        include: { user: { select: { profileImage: true } } },
                    },
                },
            });
        } else {
            attendance = await this.prisma.client.attendance.create({
                data: {
                    employeeId: employeeId,
                    date: today,
                    checkInTime: now,
                    status: status,
                    performBy: performerId,
                },
                include: {
                    employee: {
                        include: { user: { select: { profileImage: true } } },
                    },
                },
            });
        }

        return Result.ok(CommonMapper.mapToAttendanceDto(attendance)!);
    }

    async checkOut(
        dto: CheckOutDto,
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        let { employeeId, qrToken, notes } = dto;

        if (!employeeId && performerId) {
            const emp = await this.prisma.client.employee.findFirst({
                where: { userId: performerId },
            });
            if (emp) employeeId = emp.id;
        }

        if (!employeeId) return Result.fail('Employee ID is required');

        // Verify QR Token or Check Performer Permissions
        if (qrToken) {
            await this.qrManagerService.verifyToken(qrToken, 'OUT');
        } else if (performerId) {
            const performer = await this.prisma.client.user.findUnique({
                where: { id: performerId },
                include: { userRoles: { include: { role: true } } },
            });
            const roles = performer?.userRoles.map((ur) => ur.role.name) || [];
            if (
                !roles.includes(RoleName.ADMIN) &&
                !roles.includes(RoleName.HR_MANAGER)
            ) {
                return Result.fail(
                    'Manual clock-out requires Admin or HR roles.',
                );
            }
        } else {
            return Result.fail('QR token or manual authorization required.');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.client.attendance.findFirst({
            where: {
                employeeId: employeeId,
                date: today,
                isDeleted: false,
            },
            include: {
                employee: {
                    include: {
                        shift: true,
                        user: { select: { profileImage: true } },
                    },
                },
            },
        });

        if (!attendance) {
            return Result.fail(
                'Attendance record not found for today. Please check in first.',
            );
        }

        if (attendance.checkOutTime) {
            return Result.fail('Employee has already checked out for today.');
        }

        const checkOutTime = new Date();
        const checkInTime = attendance.checkInTime;

        let workHours = 0;
        let overtime = 0;

        if (checkInTime) {
            // Calculate duration using UTC components to avoid 1970 vs today year mismatch
            // and timezone issues. Prisma returns 1970-01-01 for @db.Time.
            const startTotalMinutes =
                checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
            const endTotalMinutes =
                checkOutTime.getUTCHours() * 60 + checkOutTime.getUTCMinutes();

            let diffMinutes = endTotalMinutes - startTotalMinutes;

            // Handle night shifts (clock out on "next" day relative to clock in)
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60;
            }

            workHours = diffMinutes / 60;

            // Calculate overtime (hours beyond standard 8-hour workday)
            const standardWorkHours = 8; // Default 8 hours
            if (workHours > standardWorkHours) {
                overtime = workHours - standardWorkHours;
                workHours = standardWorkHours;
            }
        }

        const updatedAttendance = await this.prisma.client.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime,
                workHours: Math.min(Math.round(workHours * 100) / 100, 999.99),
                overtime: Math.min(Math.round(overtime * 100) / 100, 999.99),
                notes: notes,
                performBy: performerId,
            },
            include: {
                employee: {
                    include: { user: { select: { profileImage: true } } },
                },
            },
        });

        return Result.ok(CommonMapper.mapToAttendanceDto(updatedAttendance)!);
    }

    async getMeAttendance(
        userId: string,
        query: AttendanceQueryDto,
    ): Promise<Result<MeAttendanceResponseDto>> {
        const {
            page = 1,
            limit = 10,
            dateFrom,
            dateTo,
            status,
            sortOrder = 'desc',
        } = query;

        const skip = (page - 1) * limit;

        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) return Result.fail('Employee record not found for user');

        const where: Prisma.AttendanceWhereInput = {
            employeeId: employee.id,
            isDeleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (dateFrom || dateTo) {
            where.date = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            };
        }

        const [records, total, summaryData, leaveCount] =
            await this.prisma.$transaction([
                this.prisma.client.attendance.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { date: sortOrder },
                }),
                this.prisma.client.attendance.count({ where }),
                this.prisma.client.attendance.aggregate({
                    where,
                    _sum: { workHours: true, overtime: true },
                    _count: {
                        id: true,
                        status: true,
                    },
                }),
                this.prisma.client.leaveRequest.count({
                    where: {
                        employeeId: employee.id,
                        status: 'APPROVED',
                        isDeleted: false,
                        ...(dateFrom || dateTo
                            ? {
                                  startDate: {
                                      ...(dateTo
                                          ? { lte: new Date(dateTo) }
                                          : {}),
                                  },
                                  endDate: {
                                      ...(dateFrom
                                          ? { gte: new Date(dateFrom) }
                                          : {}),
                                  },
                              }
                            : {}),
                    },
                }),
            ]);

        // Get status-specific counts for the summary
        const statusCounts = await this.prisma.client.attendance.groupBy({
            by: ['status'],
            where,
            orderBy: { status: 'asc' },
            _count: { _all: true },
        });

        const getCount = (s: string) =>
            statusCounts.find((c) => c.status === s)?._count._all || 0;

        const statusMap: Record<string, string> = {
            [AttendanceStatus.PRESENT]: 'normal',
            [AttendanceStatus.LATE]: 'late',
            [AttendanceStatus.EARLY_OUT]: 'early_leave',
            [AttendanceStatus.ABSENT]: 'absent',
            [AttendanceStatus.ON_LEAVE]: 'on_leave',
        };

        const summary: MeAttendanceSummaryDto = {
            totalDays: summaryData._count.id,
            daysPresent:
                getCount(AttendanceStatus.PRESENT) +
                getCount(AttendanceStatus.LATE) +
                getCount(AttendanceStatus.EARLY_OUT),
            daysAbsent: getCount(AttendanceStatus.ABSENT),
            daysOnLeave: getCount(AttendanceStatus.ON_LEAVE) || leaveCount,
            totalHoursWorked: Number(summaryData._sum.workHours || 0),
            totalOvertimeHours: Number(summaryData._sum.overtime || 0),
            lateCount: getCount(AttendanceStatus.LATE),
            earlyLeaveCount: getCount(AttendanceStatus.EARLY_OUT),
        };

        const mappedRecords: MeAttendanceRecordDto[] = records.map((r) => {
            const dateStr = r.date.toISOString().split('T')[0];
            const formatTime = (d: Date | null) =>
                d ? d.toISOString().split('T')[1].split('.')[0] : null;

            return {
                id: r.id,
                date: dateStr,
                clockIn: {
                    time: formatTime(r.checkInTime),
                    isLate: r.status === 'LATE',
                },
                clockOut: r.checkOutTime
                    ? {
                          time: formatTime(r.checkOutTime),
                          isEarly: r.status === 'EARLY_OUT',
                      }
                    : null,
                hoursWorked: Number(r.workHours || 0),
                overtimeHours: Number(r.overtime || 0),
                status: statusMap[r.status] || r.status.toLowerCase(),
                leaveType: null,
            };
        });

        const pagination: MeAttendancePaginationDto = {
            page,
            limit,
            total,
            hasMore: page * limit < total,
        };

        return Result.ok({
            records: mappedRecords,
            summary,
            pagination,
        });
    }

    async getMeAttendanceSummary(
        userId: string,
        query: AttendanceQueryDto,
    ): Promise<Result<MeAttendanceSummaryDto>> {
        const { dateFrom, dateTo, status } = query;

        const employee = await this.prisma.client.employee.findFirst({
            where: { userId, isDeleted: false },
        });

        if (!employee) return Result.fail('Employee record not found for user');

        const where: Prisma.AttendanceWhereInput = {
            employeeId: employee.id,
            isDeleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (dateFrom || dateTo) {
            where.date = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            };
        }

        const [summaryData, leaveCount] = await this.prisma.$transaction([
            this.prisma.client.attendance.aggregate({
                where,
                _sum: { workHours: true, overtime: true },
                _count: {
                    id: true,
                },
            }),
            this.prisma.client.leaveRequest.count({
                where: {
                    employeeId: employee.id,
                    status: 'APPROVED',
                    isDeleted: false,
                    ...(dateFrom || dateTo
                        ? {
                              startDate: {
                                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                              },
                              endDate: {
                                  ...(dateFrom
                                      ? { gte: new Date(dateFrom) }
                                      : {}),
                              },
                          }
                        : {}),
                },
            }),
        ]);

        const statusCounts = await this.prisma.client.attendance.groupBy({
            by: ['status'],
            where,
            orderBy: { status: 'asc' },
            _count: { _all: true },
        });

        const getCount = (s: string) =>
            statusCounts.find((c) => c.status === s)?._count._all || 0;

        const summary: MeAttendanceSummaryDto = {
            totalDays: summaryData._count.id,
            daysPresent:
                getCount(AttendanceStatus.PRESENT) +
                getCount(AttendanceStatus.LATE) +
                getCount(AttendanceStatus.EARLY_OUT),
            daysAbsent: getCount(AttendanceStatus.ABSENT),
            daysOnLeave: getCount(AttendanceStatus.ON_LEAVE) || leaveCount,
            totalHoursWorked: Number(summaryData._sum.workHours || 0),
            totalOvertimeHours: Number(summaryData._sum.overtime || 0),
            lateCount: getCount(AttendanceStatus.LATE),
            earlyLeaveCount: getCount(AttendanceStatus.EARLY_OUT),
        };

        return Result.ok(summary);
    }
}

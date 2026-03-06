import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { CommonMapper } from '../../common/mappers/common.mapper';
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
            search,
            childIncluded = false,
            sortBy = 'date',
            sortOrder = 'desc',
        } = query;

        const skip = query.skip;

        // 1. Setup Date Range
        const start = dateFrom ? new Date(dateFrom) : new Date();
        const end = dateTo ? new Date(dateTo) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const rangeDaysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Determine if we should do a "Dense" roll call (showing all employees)
        // We do it for small ranges to provide accurate absent/on-leave tracking
        const isDenseRange = rangeDaysCount <= 31;

        if (isDenseRange) {
            // 2. Fetch data for Dense Roll Call
            const [employees, existingAttendances, approvedLeaves] =
                await Promise.all([
                    this.prisma.client.employee.findMany({
                        where: {
                            isDeleted: false,
                            status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] },
                            ...(employeeId ? { id: employeeId } : {}),
                            ...(search
                                ? {
                                      OR: [
                                          {
                                              firstname: {
                                                  contains: search,
                                                  mode: 'insensitive',
                                              },
                                          },
                                          {
                                              lastname: {
                                                  contains: search,
                                                  mode: 'insensitive',
                                              },
                                          },
                                          {
                                              employeeCode: {
                                                  contains: search,
                                                  mode: 'insensitive',
                                              },
                                          },
                                      ],
                                  }
                                : {}),
                        },
                        include: { department: true, position: true },
                    }),
                    this.prisma.client.attendance.findMany({
                        where: {
                            isDeleted: false,
                            date: { gte: start, lte: end },
                            ...(employeeId ? { employeeId } : {}),
                        },
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
                    }),
                    this.prisma.client.leaveRequest.findMany({
                        where: {
                            status: 'APPROVED',
                            isDeleted: false,
                            startDate: { lte: end },
                            endDate: { gte: start },
                            ...(employeeId ? { employeeId } : {}),
                        },
                    }),
                ]);

            // 3. Generate Dense List
            const dateRangeDays: string[] = [];
            const tempDate = new Date(start);
            while (tempDate <= end) {
                dateRangeDays.push(tempDate.toISOString().split('T')[0]);
                tempDate.setDate(tempDate.getDate() + 1);
            }

            const fullRollCall: AttendanceDto[] = [];
            for (const dateStr of dateRangeDays) {
                const dayDate = new Date(dateStr);
                dayDate.setHours(0, 0, 0, 0);

                for (const emp of employees) {
                    // 1. Find matching attendance record
                    const record = existingAttendances.find((a) => {
                        const aDateStr = new Date(a.date).toLocaleDateString(
                            'sv-SE',
                        );
                        return a.employeeId === emp.id && aDateStr === dateStr;
                    });

                    // 2. Check for approved leave
                    const leave = approvedLeaves.find((l) => {
                        const lStart = new Date(l.startDate);
                        const lEnd = new Date(l.endDate);
                        lStart.setHours(0, 0, 0, 0);
                        lEnd.setHours(23, 59, 59, 999);
                        return (
                            l.employeeId === emp.id &&
                            dayDate >= lStart &&
                            dayDate <= lEnd
                        );
                    });

                    if (record) {
                        // Use existing record, even if they are on leave (could be working while on leave)
                        fullRollCall.push(
                            CommonMapper.mapToAttendanceDto(record)!,
                        );
                    } else if (leave) {
                        // No record, but on leave -> ON_LEAVE
                        const leaveRecord = {
                            id: `v-leave-${emp.id}-${dateStr}`,
                            employeeId: emp.id,
                            date: dayDate,
                            status: AttendanceStatus.ON_LEAVE,
                            employee: emp,
                            isActive: true,
                            createdAt: dayDate,
                            updatedAt: dayDate,
                        };
                        fullRollCall.push(
                            CommonMapper.mapToAttendanceDto(leaveRecord)!,
                        );
                    } else {
                        // No record, not on leave -> ABSENT
                        const absentRecord = {
                            id: `v-absent-${emp.id}-${dateStr}`,
                            employeeId: emp.id,
                            date: dayDate,
                            status: AttendanceStatus.ABSENT,
                            employee: emp,
                            isActive: true,
                            createdAt: dayDate,
                            updatedAt: dayDate,
                        };
                        fullRollCall.push(
                            CommonMapper.mapToAttendanceDto(absentRecord)!,
                        );
                    }
                }
            }

            // 4. Apply Filters (Status)
            let filtered = fullRollCall;
            if (status) {
                filtered = filtered.filter((a) => a.status === status);
            }

            // 5. Calculate Summary from fullRollCall (before pagination)
            const getStatusCount = (s: string) =>
                fullRollCall.filter((a) => a.status === s).length;
            const summary: AttendanceSummaryDto = {
                daysPresent:
                    getStatusCount(AttendanceStatus.PRESENT) +
                    getStatusCount(AttendanceStatus.LATE) +
                    getStatusCount(AttendanceStatus.EARLY_OUT),
                lateCount: getStatusCount(AttendanceStatus.LATE),
                daysAbsent: getStatusCount(AttendanceStatus.ABSENT),
                daysOnLeave: getStatusCount(AttendanceStatus.ON_LEAVE),
                totalHoursWorked: fullRollCall.reduce(
                    (sum, a) => sum + Number(a.workHours || 0),
                    0,
                ),
                totalOvertimeHours: fullRollCall.reduce(
                    (sum, a) => sum + Number(a.overtime || 0),
                    0,
                ),
            };

            // 6. Sort
            filtered.sort((a, b) => {
                let valA = (a as any)[sortBy];
                let valB = (b as any)[sortBy];

                if (valA instanceof Date) valA = valA.getTime();
                if (valB instanceof Date) valB = valB.getTime();

                // Handle nulls
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (sortOrder === 'desc') return valB > valA ? 1 : -1;
                return valA > valB ? 1 : -1;
            });

            // 7. Paginate
            const total = filtered.length;
            const data = filtered.slice(skip, skip + limit);

            return Result.ok(
                ResultPagination.of(data, total, page, limit, summary),
            );
        }

        // Fallback for large ranges (> 31 days) - only showing existing records
        const where: Prisma.AttendanceWhereInput = {
            isDeleted: false,
            date: { gte: start, lte: end },
        };

        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status as any;
        if (search) {
            where.employee = {
                OR: [
                    { firstname: { contains: search, mode: 'insensitive' } },
                    { lastname: { contains: search, mode: 'insensitive' } },
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const [
            attendances,
            total,
            aggregates,
            statusCounts,
            activeEmployeesCount,
            leaveRequestsCount,
        ] = await this.prisma.$transaction([
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
                        ? { include: { department: true, position: true } }
                        : false,
                },
                orderBy: { [sortBy]: sortOrder },
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
            this.prisma.client.employee.count({
                where: { status: 'ACTIVE', isDeleted: false },
            }),
            this.prisma.client.leaveRequest.count({
                where: {
                    status: 'APPROVED',
                    isDeleted: false,
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
            }),
        ]);

        // Calculate Summary using Set-based approach to avoid double-counting
        const [allRecordsForRange, approvedLeavesForRange] = await Promise.all([
            this.prisma.client.attendance.findMany({
                where: { isDeleted: false, date: { gte: start, lte: end } },
                select: { employeeId: true, date: true, status: true },
            }),
            this.prisma.client.leaveRequest.findMany({
                where: {
                    status: 'APPROVED',
                    isDeleted: false,
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
                select: { employeeId: true, startDate: true, endDate: true },
            }),
        ]);

        const workingSet = new Set<string>(); // "empId:YYYY-MM-DD"
        let presentDays = 0;
        let lateDays = 0;
        let manualAbsents = 0;

        for (const att of allRecordsForRange) {
            const dStr = new Date(att.date).toISOString().split('T')[0];
            const key = `${att.employeeId}:${dStr}`;
            workingSet.add(key);

            if (att.status === 'PRESENT' || att.status === 'EARLY_OUT')
                presentDays++;
            else if (att.status === 'LATE') lateDays++;
            else if (att.status === 'ABSENT') manualAbsents++;
        }

        const leaveSet = new Set<string>();
        for (const leave of approvedLeavesForRange) {
            const lStart =
                new Date(leave.startDate) > start
                    ? new Date(leave.startDate)
                    : start;
            const lEnd =
                new Date(leave.endDate) < end ? new Date(leave.endDate) : end;
            const cur = new Date(lStart);
            while (cur <= lEnd) {
                const dStr = cur.toISOString().split('T')[0];
                const key = `${leave.employeeId}:${dStr}`;
                if (!workingSet.has(key)) leaveSet.add(key);
                cur.setDate(cur.getDate() + 1);
            }
        }

        const totalExpectedDays = activeEmployeesCount * rangeDaysCount;
        const totalLeaveDays = leaveSet.size;
        const virtualAbsences = Math.max(
            0,
            totalExpectedDays -
                (presentDays + lateDays + totalLeaveDays + manualAbsents),
        );

        const summary: AttendanceSummaryDto = {
            daysPresent: presentDays + lateDays,
            lateCount: lateDays,
            daysAbsent: manualAbsents + virtualAbsences,
            daysOnLeave: totalLeaveDays,
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
        let { employeeId, qrToken, clientTime, clientTimezone } = dto;

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
        const effectiveCheckInTime = clientTime ? new Date(clientTime) : now;
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

            // Use clientTime for status comparison if provided, else use server time
            const comparisonTime = clientTime ? new Date(clientTime) : now;
            if (comparisonTime > expectedStart) {
                status = AttendanceStatus.LATE;
            }
        } else {
            // Default fallback if no shift assigned (9 AM UTC)
            const startWorkTime = new Date(now);
            startWorkTime.setUTCHours(9, 0, 0, 0);
            const comparisonTime = clientTime ? new Date(clientTime) : now;
            if (comparisonTime > startWorkTime) status = AttendanceStatus.LATE;
        }

        let attendance;
        if (existingAttendance) {
            // Update existing record (e.g. if it was marked as ABSENT)
            attendance = await this.prisma.client.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    checkInTime: effectiveCheckInTime,
                    checkInOccurredAt: now,
                    clientTimezone: clientTimezone,
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
                    checkInTime: effectiveCheckInTime,
                    checkInOccurredAt: now,
                    clientTimezone: clientTimezone,
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
        let { employeeId, qrToken, notes, clientTime, clientTimezone } = dto;

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

        const now = new Date();
        const effectiveCheckOutTime = clientTime ? new Date(clientTime) : now;
        const checkInTime = attendance.checkInTime;

        let workHours = 0;
        let overtime = 0;

        if (checkInTime) {
            // Calculate duration using UTC components to avoid 1970 vs today year mismatch
            // and timezone issues. Prisma returns 1970-01-01 for @db.Time.
            const startTotalMinutes =
                checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
            const endTotalMinutes =
                effectiveCheckOutTime.getUTCHours() * 60 +
                effectiveCheckOutTime.getUTCMinutes();

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
                checkOutTime: effectiveCheckOutTime,
                checkOutOccurredAt: now,
                clientTimezone: clientTimezone || attendance.clientTimezone,
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
                    occurredAt: r.checkInOccurredAt,
                },
                clockOut: r.checkOutTime
                    ? {
                          time: formatTime(r.checkOutTime),
                          isEarly: r.status === 'EARLY_OUT',
                          occurredAt: r.checkOutOccurredAt,
                      }
                    : null,
                hoursWorked: Number(r.workHours || 0),
                overtimeHours: Number(r.overtime || 0),
                status: statusMap[r.status] || r.status.toLowerCase(),
                leaveType: null,
                clientTimezone: r.clientTimezone,
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

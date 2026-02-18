import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AttendanceDto } from './dtos/attendance.dto';
import { AttendanceQueryDto } from './dtos/attendance-query.dto';
import { Result } from 'src/common/logic/result';
import { AttendanceStatus } from 'src/common/enums/attendance-status.enum';

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
import { DecimalNumber } from 'src/config/decimal-number';

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
                          },
                      }
                    : false,
            },
        });
        return Result.ok(attendances.map((a) => this.mapToAttendanceDto(a)));
    }

    private mapToAttendanceDto(a: any): AttendanceDto {
        return {
            id: a.id,
            employeeId: a.employeeId,
            status: a.status,
            date: a.date,
            checkInTime: a.checkInTime,
            checkOutTime: a.checkOutTime,
            workHours: a.workHours ? new DecimalNumber(a.workHours) : null,
            overtime: a.overtime ? new DecimalNumber(a.overtime) : null,
            notes: a.notes,
            performBy: a.performBy,
            performer: a.performer ? this.mapToUserDto(a.performer) : null,
            employee: a.employee ? this.mapToEmployeeDto(a.employee) : null,
            isActive: a.isActive,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
        } as any;
    }

    private mapToUserDto(u: any): any {
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            roles: u.userRoles?.map((ur: any) => ur.role.name) || [],
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        };
    }

    private mapToEmployeeDto(e: any): any {
        return {
            id: e.id,
            employeeCode: e.employeeCode,
            firstname: e.firstname,
            lastname: e.lastname,
            gender:
                e.gender === 0 ? 'male' : e.gender === 1 ? 'female' : 'unknown',
            dateOfBirth: e.dob?.toISOString().split('T')[0],
            userId: e.userId,
            address: e.address,
            phoneNumber: e.phone,
            profileImage: e.profileImage,
            hireDate: e.hireDate,
            positionId: e.positionId,
            departmentId: e.departmentId,
            employmentType: e.employmentType,
            status: e.status,
            salary: e.salary ? new DecimalNumber(e.salary) : null,
            isActive: e.isActive,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
        };
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
                    _count: { _all: true },
                }),
            ]);

        const getCount = (s: string) =>
            statusCounts.find((c) => c.status === s)?._count._all || 0;

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

        const data = attendances.map((a) => this.mapToAttendanceDto(a));
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
                          },
                      }
                    : false,
            },
        });
        if (!attendance) return Result.fail('Attendance not found');
        return Result.ok(this.mapToAttendanceDto(attendance));
    }

    async checkIn(
        dto: CheckInDto,
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        const { employeeId, qrToken } = dto;

        // Verify QR Token
        await this.qrManagerService.verifyToken(qrToken, 'IN');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance =
            await this.prisma.client.attendance.findFirst({
                where: {
                    employeeId: employeeId,
                    date: today,
                },
            });

        if (existingAttendance) {
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

            // Construct today's expected start time
            const expectedStart = new Date(now);
            expectedStart.setHours(
                shiftStart.getUTCHours(),
                shiftStart.getUTCMinutes(),
                0,
                0,
            );

            // Adjust for local time offset if needed? checkInTime is usually stored/handled in server time.
            // Assuming Shift.startTime is stored as UTC for the time-of-day.
            // If checking "LATE", we compare now vs expectedStart + gracePeriod.

            const graceMinutes = employee.shift.gracePeriodMins || 0;
            expectedStart.setMinutes(expectedStart.getMinutes() + graceMinutes);

            if (now > expectedStart) {
                status = AttendanceStatus.LATE;
            }
        } else {
            // Default fallback if no shift assigned (e.g. 9 AM)
            const startWorkTime = new Date();
            startWorkTime.setHours(9, 0, 0, 0);
            if (now > startWorkTime) status = AttendanceStatus.LATE;
        }

        const attendance = await this.prisma.client.attendance.create({
            data: {
                employeeId: dto.employeeId,
                date: today,
                checkInTime: now,
                status: status,
                performBy: performerId,
            },
            include: { employee: true },
        });

        return Result.ok(this.mapToAttendanceDto(attendance));
    }

    async checkOut(
        dto: CheckOutDto,
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        const { employeeId, qrToken, notes } = dto;

        // Verify QR Token
        await this.qrManagerService.verifyToken(qrToken, 'OUT');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.client.attendance.findFirst({
            where: {
                employeeId: employeeId,
                date: today,
            },
            include: { employee: { include: { shift: true } } },
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
            const diffMs = checkOutTime.getTime() - checkInTime.getTime();
            workHours = diffMs / (1000 * 60 * 60); // Convert to hours

            // Calculate overtime (hours beyond standard 8-hour workday)
            const standardWorkHours = attendance.employee?.shift ? 8 : 8; // Default 8 hours
            if (workHours > standardWorkHours) {
                overtime = workHours - standardWorkHours;
                workHours = standardWorkHours;
            }
        }

        const updatedAttendance = await this.prisma.client.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime,
                workHours: Math.round(workHours * 100) / 100,
                overtime: Math.round(overtime * 100) / 100,
                notes: notes,
                performBy: performerId,
            },
            include: { employee: true },
        });

        return Result.ok(this.mapToAttendanceDto(updatedAttendance));
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

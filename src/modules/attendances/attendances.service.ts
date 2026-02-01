import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { AttendanceDto } from './dtos/attendance.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import { AttendanceStatus } from 'src/common/enums/attendance-status.enum';

import { ResultPagination } from '../../common/logic/result-pagination';

@Injectable()
export class AttendancesService {
    constructor(private readonly prisma: PrismaService) {}

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
        return Result.ok(
            attendances.map((a) => plainToInstance(AttendanceDto, a)),
        );
    }

    async findAllPaginatedAsync(
        page: number,
        limit: number,
        childIncluded?: boolean,
    ): Promise<Result<ResultPagination<AttendanceDto>>> {
        const skip = (page - 1) * limit;

        const [attendances, total] = await this.prisma.$transaction([
            this.prisma.client.attendance.findMany({
                where: { isDeleted: false },
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
                orderBy: { date: 'desc' },
            }),
            this.prisma.client.attendance.count({
                where: { isDeleted: false },
            }),
        ]);

        const data = attendances.map((a) => plainToInstance(AttendanceDto, a));
        return Result.ok(ResultPagination.of(data, total, page, limit));
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
        return Result.ok(plainToInstance(AttendanceDto, attendance));
    }

    async checkIn(
        dto: { employeeId: string },
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance =
            await this.prisma.client.attendance.findFirst({
                where: {
                    employeeId: dto.employeeId,
                    date: today,
                },
            });

        if (existingAttendance) {
            return Result.fail('Employee has already checked in for today.');
        }

        // Fetch employee to get shift details
        const employee = await this.prisma.client.employee.findFirst({
            where: { id: dto.employeeId },
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

        return Result.ok(plainToInstance(AttendanceDto, attendance));
    }

    async checkOut(
        dto: { employeeId: string; notes?: string },
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.client.attendance.findFirst({
            where: {
                employeeId: dto.employeeId,
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
                notes: dto.notes,
                performBy: performerId,
            },
            include: { employee: true },
        });

        return Result.ok(plainToInstance(AttendanceDto, updatedAttendance));
    }
}

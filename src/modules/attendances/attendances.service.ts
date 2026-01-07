import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { AttendanceDto } from './dtos/attendance.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import { AttendanceStatus } from 'src/common/enums/attendance-status.enum';

@Injectable()
export class AttendancesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllAsync(
        childIncluded?: boolean,
    ): Promise<Result<AttendanceDto[]>> {
        const attendances = await this.prisma.attendance.findMany({
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

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<AttendanceDto>> {
        const attendance = await this.prisma.attendance.findFirst({
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

        const existingAttendance = await this.prisma.attendance.findFirst({
            where: {
                employeeId: dto.employeeId,
                date: today,
            },
        });

        if (existingAttendance) {
            return Result.fail('Employee has already checked in for today.');
        }

        // Fetch employee to get shift details
        const employee = await this.prisma.employee.findUnique({
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

        const attendance = await this.prisma.attendance.create({
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
        dto: { employeeId: string },
        performerId?: string,
    ): Promise<Result<AttendanceDto>> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.attendance.findFirst({
            where: {
                employeeId: dto.employeeId,
                date: today,
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

        const updatedAttendance = await this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: new Date(),
                performBy: performerId,
            },
            include: { employee: true },
        });

        return Result.ok(plainToInstance(AttendanceDto, updatedAttendance));
    }
}

import { PrismaClient } from '@prisma/client';
import { AttendanceStatus } from '../../src/common/enums/attendance-status.enum';
import { LeaveStatus } from '../../src/common/enums/leave-status.enum';

export async function seedAttendances(prisma: PrismaClient) {
    console.log('--- Seeding Attendances ---');
    const now = new Date();

    const employees = await prisma.employee.findMany({
        select: { id: true, lastname: true },
    });

    // Ensure we have attendance data for TODAY specifically
    // Use UTC date to match database storage
    const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const todayDay = now.getDay();
    const isTodayWeekend = todayDay === 0 || todayDay === 6;

    // Check if today is a holiday
    const isTodayHoliday = await prisma.publicHoliday.findFirst({
        where: { date: today },
        select: { id: true },
    });

    // Create attendance for today (force create even on weekends for testing)
    console.log('--- Seeding TODAY attendances ---');
    console.log('Today (UTC):', today.toISOString());
    console.log('Is weekend:', isTodayWeekend);
    console.log('Is holiday:', !!isTodayHoliday);
    console.log('Total employees:', employees.length);

    // Create attendance for all 50 employees today with realistic distribution
    console.log(
        `Creating attendance for all ${employees.length} employees today`,
    );

    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];

        // Check if attendance already exists for today
        const exists = await prisma.attendance.findFirst({
            where: { employeeId: emp.id, date: today },
            select: { id: true },
        });

        if (!exists) {
            // Check if employee has approved leave covering today
            const approvedLeave = await prisma.leaveRequest.findFirst({
                where: {
                    employeeId: emp.id,
                    status: LeaveStatus.APPROVED,
                    startDate: { lte: today },
                    endDate: { gte: today },
                },
                select: { id: true },
            });

            let status: AttendanceStatus;
            let checkIn: Date | null = new Date(today);
            let checkOut: Date | null = new Date(today);

            if (approvedLeave) {
                // Employee is on approved leave
                status = AttendanceStatus.ON_LEAVE;
                checkIn = null;
                checkOut = null;
            } else {
                // Random distribution for employees not on leave
                const rand = Math.random();
                if (rand < 0.85) {
                    // ~85% present
                    status = AttendanceStatus.PRESENT;
                    checkIn.setUTCHours(
                        8 + Math.floor(Math.random() * 2), // 8-9 AM
                        Math.floor(Math.random() * 30), // 0-29 minutes
                        0,
                    );
                    checkOut.setUTCHours(
                        16 + Math.floor(Math.random() * 2), // 4-5 PM
                        Math.floor(Math.random() * 30), // 0-29 minutes
                        0,
                    );
                } else if (rand < 0.95) {
                    // ~10% late
                    status = AttendanceStatus.LATE;
                    checkIn.setUTCHours(
                        9 + Math.floor(Math.random() * 2), // 9-10 AM
                        30 + Math.floor(Math.random() * 30), // 30-59 minutes
                        0,
                    );
                    checkOut.setUTCHours(
                        17 + Math.floor(Math.random() * 2), // 5-6 PM
                        Math.floor(Math.random() * 30), // 0-29 minutes
                        0,
                    );
                } else {
                    // ~5% absent
                    status = AttendanceStatus.ABSENT;
                    checkIn = null;
                    checkOut = null;
                }
            }

            await prisma.attendance.create({
                data: {
                    employeeId: emp.id,
                    date: today,
                    status: status,
                    checkInTime: checkIn,
                    checkOutTime: checkOut,
                },
                select: { id: true },
            });

            console.log(
                `Created attendance for ${emp.lastname} today - Status: ${status}`,
            );
        } else {
            console.log(`Attendance already exists for ${emp.lastname} today`);
        }
    }

    // Create historical attendance for the last 30 days (excluding today)
    // Only create for 30 employees (60%) to keep data reasonable
    console.log('--- Seeding historical attendance (last 30 days) ---');

    const historicalEmployees = employees.slice(0, 30); // First 30 employees get historical data

    // Get all approved leaves for historical employees in the last 30 days
    const historicalEmployeeIds = historicalEmployees.map((e) => e.id);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            employeeId: { in: historicalEmployeeIds },
            status: LeaveStatus.APPROVED,
            startDate: { lte: now },
            endDate: { gte: thirtyDaysAgo },
        },
        select: {
            employeeId: true,
            startDate: true,
            endDate: true,
        },
    });

    // Create a map for quick lookup: employeeId -> array of leave date ranges
    const leaveMap = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const leave of approvedLeaves) {
        if (!leaveMap.has(leave.employeeId)) {
            leaveMap.set(leave.employeeId, []);
        }
        leaveMap.get(leave.employeeId)!.push({
            start: leave.startDate,
            end: leave.endDate,
        });
    }

    for (const emp of historicalEmployees) {
        // Each employee gets different attendance patterns
        const employeePattern = Math.random();

        for (let d = 1; d <= 30; d++) {
            const date = new Date(now);
            date.setUTCDate(date.getUTCDate() - d);

            // Skip if date is in the future (shouldn't happen)
            if (date > now) continue;

            // Skip weekends
            const day = date.getDay();
            if (day === 0 || day === 6) continue;

            // Check if holiday
            const isHoliday = await prisma.publicHoliday.findFirst({
                where: { date: date },
                select: { id: true },
            });
            if (isHoliday) continue;

            // Check if attendance already exists
            const exists = await prisma.attendance.findFirst({
                where: { employeeId: emp.id, date: date },
                select: { id: true },
            });

            if (!exists) {
                // Check if employee is on approved leave for this date
                const employeeLeaves = leaveMap.get(emp.id);
                let isOnLeave = false;
                if (employeeLeaves) {
                    for (const leave of employeeLeaves) {
                        if (date >= leave.start && date <= leave.end) {
                            isOnLeave = true;
                            break;
                        }
                    }
                }

                if (isOnLeave) {
                    // Employee is on approved leave
                    await prisma.attendance.create({
                        data: {
                            employeeId: emp.id,
                            date: date,
                            status: AttendanceStatus.ON_LEAVE,
                            checkInTime: null,
                            checkOutTime: null,
                        },
                        select: { id: true },
                    });
                    continue; // Skip to next date
                }

                let status = AttendanceStatus.PRESENT;
                let checkIn: Date | null = new Date(date);
                let checkOut: Date | null = new Date(date);

                // Different patterns for different employees:
                // - Good employees (60%): 95% present, 4% late, 1% absent
                // - Average employees (30%): 85% present, 10% late, 5% absent
                // - Problem employees (10%): 70% present, 20% late, 10% absent
                const rand = Math.random();

                if (employeePattern < 0.6) {
                    // Good employee pattern
                    if (rand < 0.95) {
                        status = AttendanceStatus.PRESENT;
                        checkIn.setUTCHours(
                            8 + Math.floor(Math.random() * 2),
                            Math.floor(Math.random() * 30),
                            0,
                        );
                        checkOut.setUTCHours(
                            16 + Math.floor(Math.random() * 2),
                            Math.floor(Math.random() * 30),
                            0,
                        );
                    } else if (rand < 0.99) {
                        status = AttendanceStatus.LATE;
                        checkIn.setUTCHours(
                            9 + Math.floor(Math.random() * 2),
                            30 + Math.floor(Math.random() * 30),
                            0,
                        );
                        checkOut.setUTCHours(
                            17 + Math.floor(Math.random() * 2),
                            Math.floor(Math.random() * 30),
                            0,
                        );
                    } else {
                        status = AttendanceStatus.ABSENT;
                        checkIn = null;
                        checkOut = null;
                    }
                } else if (employeePattern < 0.9) {
                    // Average employee pattern
                    if (rand < 0.85) {
                        status = AttendanceStatus.PRESENT;
                        checkIn.setUTCHours(
                            8 + Math.floor(Math.random() * 3),
                            Math.floor(Math.random() * 45),
                            0,
                        );
                        checkOut.setUTCHours(
                            16 + Math.floor(Math.random() * 3),
                            Math.floor(Math.random() * 45),
                            0,
                        );
                    } else if (rand < 0.95) {
                        status = AttendanceStatus.LATE;
                        checkIn.setUTCHours(
                            9 + Math.floor(Math.random() * 3),
                            30 + Math.floor(Math.random() * 30),
                            0,
                        );
                        checkOut.setUTCHours(
                            17 + Math.floor(Math.random() * 3),
                            Math.floor(Math.random() * 45),
                            0,
                        );
                    } else {
                        status = AttendanceStatus.ABSENT;
                        checkIn = null;
                        checkOut = null;
                    }
                } else {
                    // Problem employee pattern
                    if (rand < 0.7) {
                        status = AttendanceStatus.PRESENT;
                        checkIn.setUTCHours(
                            8 + Math.floor(Math.random() * 4),
                            Math.floor(Math.random() * 60),
                            0,
                        );
                        checkOut.setUTCHours(
                            16 + Math.floor(Math.random() * 4),
                            Math.floor(Math.random() * 60),
                            0,
                        );
                    } else if (rand < 0.9) {
                        status = AttendanceStatus.LATE;
                        checkIn.setUTCHours(
                            10 + Math.floor(Math.random() * 3),
                            Math.floor(Math.random() * 60),
                            0,
                        );
                        checkOut.setUTCHours(
                            18 + Math.floor(Math.random() * 3),
                            Math.floor(Math.random() * 60),
                            0,
                        );
                    } else {
                        status = AttendanceStatus.ABSENT;
                        checkIn = null;
                        checkOut = null;
                    }
                }

                await prisma.attendance.create({
                    data: {
                        employeeId: emp.id,
                        date: date,
                        status: status,
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                    },
                    select: { id: true },
                });
            }
        }
    }
}

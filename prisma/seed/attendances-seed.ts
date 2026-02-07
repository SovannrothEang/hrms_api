import { PrismaClient } from '@prisma/client';
import { AttendanceStatus } from '../../src/common/enums/attendance-status.enum';

export async function seedAttendances(prisma: PrismaClient) {
    console.log('--- Seeding Attendances ---');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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

    // Take first 20 employees to create today's attendance
    const todayEmployees = employees.slice(0, 20);

    for (let i = 0; i < todayEmployees.length; i++) {
        const emp = todayEmployees[i];

        // Check if attendance already exists for today
        const exists = await prisma.attendance.findFirst({
            where: { employeeId: emp.id, date: today },
            select: { id: true },
        });

        if (!exists) {
            // Distribute statuses: 70% present, 20% late, 10% absent
            let status: AttendanceStatus;
            let checkIn: Date | null = new Date(today);
            let checkOut: Date | null = new Date(today);

            if (i < 14) {
                // 70% present (14 out of 20)
                status = AttendanceStatus.PRESENT;
                checkIn.setUTCHours(
                    1 + Math.floor(Math.random() * 2),
                    Math.floor(Math.random() * 60),
                    0,
                );
                checkOut.setUTCHours(
                    10 + Math.floor(Math.random() * 2),
                    Math.floor(Math.random() * 60),
                    0,
                );
            } else if (i < 18) {
                // 20% late (4 out of 20)
                status = AttendanceStatus.LATE;
                checkIn.setUTCHours(2, 15 + Math.floor(Math.random() * 45), 0);
                checkOut.setUTCHours(11, Math.floor(Math.random() * 60), 0);
            } else {
                // 10% absent (2 out of 20)
                status = AttendanceStatus.ABSENT;
                checkIn = null;
                checkOut = null;
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

    // Continue with regular monthly attendance seeding
    for (const emp of employees) {
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            if (date > now) continue;

            // skip weekends
            const day = date.getDay();
            if (day === 0 || day === 6) continue;

            const isHoliday = await prisma.publicHoliday.findFirst({
                where: { date: date },
                select: { id: true },
            });
            if (isHoliday) continue;

            // Check duplicate
            const exists = await prisma.attendance.findFirst({
                where: { employeeId: emp.id, date: date },
                select: { id: true },
            });

            if (!exists) {
                // Random status logic
                const rand = Math.random();
                let status = AttendanceStatus.PRESENT;
                let checkIn: Date | null = new Date(date);
                checkIn.setHours(9, 0, 0);
                let checkOut: Date | null = new Date(date);
                checkOut.setHours(18, 0, 0);

                if (rand > 0.8) {
                    status = AttendanceStatus.LATE;
                    checkIn.setHours(9, 30, 0);
                } else if (rand > 0.95) {
                    status = AttendanceStatus.ABSENT;
                    checkIn = null;
                    checkOut = null;
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

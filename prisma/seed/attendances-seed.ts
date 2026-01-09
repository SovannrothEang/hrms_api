import { PrismaClient } from '@prisma/client';
import { AttendanceStatus } from '../../src/common/enums/attendance-status.enum';

export async function seedAttendances(prisma: PrismaClient) {
    console.log('--- Seeding Attendances ---');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const employees = await prisma.employee.findMany({ select: { id: true, lastname: true } });

    for (const emp of employees) {
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            if (date > now) continue;

            // skip weekends
            const day = date.getDay();
            if (day === 0 || day === 6) continue;

            const isHoliday = await prisma.publicHoliday.findFirst({
                where: { date: date },
                select: { id: true }
            });
            if (isHoliday) continue;

            // Check duplicate
            const exists = await prisma.attendance.findFirst({
                where: { employeeId: emp.id, date: date },
                select: { id: true }
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
                        checkOutTime: checkOut
                    },
                    select: { id: true }
                });
            }
        }
    }
}

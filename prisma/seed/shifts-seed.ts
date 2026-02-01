import { PrismaClient } from '@prisma/client';

export async function seedShifts(prisma: PrismaClient) {
    console.log('--- Seeding Shifts ---');
    const shiftsData = [
        { name: 'Morning Shift', start: '09:00', end: '18:00', grace: 15 },
        { name: 'Evening Shift', start: '14:00', end: '23:00', grace: 15 },
        { name: 'Night Shift', start: '22:00', end: '07:00', grace: 15 },
        { name: 'Early Bird', start: '07:00', end: '16:00', grace: 10 },
        { name: 'Late Shift', start: '11:00', end: '20:00', grace: 20 }
    ];

    const toTime = (timeStr: string) => new Date(`1970-01-01T${timeStr}:00Z`);

    for (const s of shiftsData) {
        const exists = await prisma.shift.findFirst({
            where: { name: s.name },
            select: { id: true }
        });

        if (!exists) {
            console.log(`Creating Shift: ${s.name}`);
            await prisma.shift.create({
                data: {
                    name: s.name,
                    startTime: toTime(s.start),
                    endTime: toTime(s.end),
                    workDays: '1,2,3,4,5',
                    gracePeriodMins: s.grace
                },
                select: { id: true }
            });
        }
    }
}

import { PrismaClient } from '@prisma/client';

export async function seedHolidays(prisma: PrismaClient) {
    console.log('--- Seeding Public Holidays ---');
    const now = new Date();
    const year = now.getFullYear();

    const holidaysData = [
        { name: 'New Year', date: `${year}-01-01` },
        { name: 'Labor Day', date: `${year}-05-01` },
        { name: 'Independence Day', date: `${year}-07-04` }
    ];

    for (const h of holidaysData) {
        const d = new Date(h.date);
        const exists = await prisma.publicHoliday.findFirst({
            where: { date: d },
            select: { id: true }
        });

        if (!exists) {
            console.log(`Creating Holiday: ${h.name}`);
            await prisma.publicHoliday.create({
                data: {
                    name: h.name,
                    date: d,
                    isRecurring: true
                },
                select: { id: true }
            });
        }
    }
}

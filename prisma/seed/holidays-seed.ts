import { PrismaClient } from '@prisma/client';

export async function seedHolidays(prisma: PrismaClient) {
    console.log('--- Seeding Public Holidays ---');
    const now = new Date();
    const year = now.getFullYear();

    const holidaysData = [
        { name: 'New Year', date: `${year}-01-01` },
        { name: 'Victory over Genocide Day', date: `${year}-01-07` },
        { name: 'Meak Bochea Day', date: `${year}-02-24` },
        { name: 'International Women Day', date: `${year}-03-08` },
        { name: 'Khmer New Year Day 1', date: `${year}-04-14` },
        { name: 'Khmer New Year Day 2', date: `${year}-04-15` },
        { name: 'Khmer New Year Day 3', date: `${year}-04-16` },
        { name: 'Labor Day', date: `${year}-05-01` },
        { name: 'King Birthday', date: `${year}-05-14` },
        { name: 'Visak Bochea Day', date: `${year}-05-22` },
        { name: 'Royal Ploughing Ceremony', date: `${year}-05-26` },
        { name: 'Children Day', date: `${year}-06-01` },
        { name: 'Queen Mother Birthday', date: `${year}-06-18` },
        { name: 'Constitution Day', date: `${year}-09-24` },
        { name: 'Pchum Ben Day 1', date: `${year}-10-01` },
        { name: 'Pchum Ben Day 2', date: `${year}-10-02` },
        { name: 'Pchum Ben Day 3', date: `${year}-10-03` },
        { name: 'King Father Memorial Day', date: `${year}-10-15` },
        { name: 'King Coronation Day', date: `${year}-10-29` },
        { name: 'Independence Day', date: `${year}-11-09` },
        { name: 'Water Festival Day 1', date: `${year}-11-14` },
        { name: 'Water Festival Day 2', date: `${year}-11-15` },
        { name: 'Water Festival Day 3', date: `${year}-11-16` },
        { name: 'Human Rights Day', date: `${year}-12-10` },
        { name: 'Christmas Day', date: `${year}-12-25` },
        { name: 'Mid-Autumn Festival', date: `${year}-09-15` },
        { name: 'V-E Day', date: `${year}-05-08` },
        { name: 'Bastille Day', date: `${year}-07-14` },
        { name: 'Thanksgiving', date: `${year}-11-28` },
        { name: 'Boxing Day', date: `${year}-12-26` }
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

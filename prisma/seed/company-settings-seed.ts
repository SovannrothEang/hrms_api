import { PrismaClient } from '@prisma/client';

export async function seedCompanySettings(prisma: PrismaClient) {
    console.log('--- Seeding Company Settings ---');

    const existingSettings = await prisma.companySettings.findFirst({
        where: { isActive: true, isDeleted: false },
        select: { id: true }
    });

    if (!existingSettings) {
        // Ensure USD currency exists as it's the base
        let currency = await prisma.currency.findUnique({
            where: { code: 'USD' }
        });

        if (!currency) {
            console.log('Creating default USD currency for Company Settings');
            currency = await prisma.currency.create({
                data: {
                    code: 'USD',
                    name: 'US Dollar',
                    symbol: '$',
                    country: 'USA'
                }
            });
        }

        console.log('Creating Default Company Settings...');
        await prisma.companySettings.create({
            data: {
                name: 'HRFlow Inc.',
                email: 'hr@hrflow.com',
                phone: '(555) 123-4567',
                address: '123 Business Street, Tech City',
                baseCurrencyCode: currency.code,
                fiscalYearStartMonth: 1,
                timezone: 'UTC',
                dateFormat: 'mdy',
                workWeekStarts: 'monday'
            }
        });
    } else {
        console.log('Company Settings already exist.');
    }
}

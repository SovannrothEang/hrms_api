import { PrismaClient } from '@prisma/client';

export async function seedPayroll(prisma: PrismaClient) {
    console.log('--- Seeding Payroll (Currencies & Tax Brackets) ---');

    // 1. Currencies
    const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', country: 'USA' },
        { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', country: 'KHM' }
    ];

    for (const c of currencies) {
        const exists = await prisma.currency.findUnique({
            where: { code: c.code },
            select: { id: true }
        });

        if (!exists) {
            console.log(`Creating Currency: ${c.code}`);
            await prisma.currency.create({
                data: c,
                select: { id: true }
            });
        }
    }

    // 2. Tax Brackets (Example for Cambodia/General)
    const currency = await prisma.currency.findUnique({ where: { code: 'USD' }, select: { code: true } });
    if (currency) {
        const brackets = [
            { name: '0% - Low', min: 0, max: 1500, rate: 0.0, fixed: 0 },
            { name: '5% - Low-Mid', min: 1500, max: 3000, rate: 0.05, fixed: 0 },
            { name: '10% - Mid', min: 3000, max: 10000, rate: 0.10, fixed: 75 },
            { name: '20% - High', min: 10000, max: 999999, rate: 0.20, fixed: 775 }
        ];

        for (const b of brackets) {
            // Check by name and year
            const exists = await prisma.taxBracket.findFirst({
                where: { bracketName: b.name, taxYear: new Date().getFullYear() },
                select: { id: true }
            });

            if (!exists) {
                console.log(`Creating Tax Bracket: ${b.name}`);
                await prisma.taxBracket.create({
                    data: {
                        currencyCode: currency.code,
                        countryCode: 'USA', // Placeholder
                        taxYear: new Date().getFullYear(),
                        bracketName: b.name,
                        minAmount: b.min,
                        maxAmount: b.max,
                        taxRate: b.rate,
                        fixedAmount: b.fixed
                    },
                    select: { id: true }
                });
            }
        }
    }
}

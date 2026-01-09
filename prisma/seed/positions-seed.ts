import { PrismaClient } from '@prisma/client';

export async function seedPositions(prisma: PrismaClient) {
    console.log('--- Seeding Positions ---');
    const positions = ['Manager', 'Senior Associate', 'Junior Associate', 'Intern'];

    for (const title of positions) {
        const exists = await prisma.employeePosition.findFirst({
            where: { title },
            select: { id: true }
        });

        if (!exists) {
            console.log(`Creating Position: ${title}`);
            await prisma.employeePosition.create({
                data: {
                    title,
                    salaryRangeMin: 1000,
                    salaryRangeMax: 5000
                },
                select: { id: true }
            });
        }
    }
}

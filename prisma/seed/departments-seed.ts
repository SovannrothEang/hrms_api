import { PrismaClient } from '@prisma/client';

export async function seedDepartments(prisma: PrismaClient) {
    console.log('--- Seeding Departments ---');
    const depts = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance'];

    for (const name of depts) {
        const exists = await prisma.department.findFirst({
            where: { departmentName: name },
            select: { id: true }
        });

        if (!exists) {
            console.log(`Creating Department: ${name}`);
            await prisma.department.create({
                data: { departmentName: name },
                select: { id: true }
            });
        }
    }
}

import { PrismaClient } from '@prisma/client';

export async function seedDepartments(prisma: PrismaClient) {
    console.log('--- Seeding Departments ---');
    const depts = [
        'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance',
        'Operations', 'Customer Support', 'Legal', 'Product Management',
        'Quality Assurance', 'IT Infrastructure', 'Administration',
        'Research and Development', 'Logistics', 'Procurement', 'Public Relations',
        'Security', 'Facilities', 'Business Intelligence', 'Data Science',
        'Design', 'Content Strategy', 'Social Media', 'Events',
        'Training', 'Compliance', 'Audit', 'Strategic Planning',
        'International Business', 'Project Management Office'
    ];

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

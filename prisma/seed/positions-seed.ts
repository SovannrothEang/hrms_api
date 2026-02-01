import { PrismaClient } from '@prisma/client';

export async function seedPositions(prisma: PrismaClient) {
    console.log('--- Seeding Positions ---');
    const positions = [
        'Chief Executive Officer', 'Chief Technology Officer', 'Department Manager', 'Team Lead', 'Senior Software Engineer',
        'Software Engineer', 'Junior Software Engineer', 'QA Engineer', 'Product Owner', 'HR Manager',
        'HR Generalist', 'Accountant', 'Sales Executive', 'Marketing Specialist', 'Intern',
        'UX Designer', 'UI Designer', 'Systems Architect', 'Data Analyst', 'DevOps Engineer',
        'Security Specialist', 'Office Manager', 'Executive Assistant', 'Business Analyst', 'Legal Counsel',
        'Recruiter', 'Payroll Specialist', 'Project Manager', 'Customer Success Manager', 'Network Engineer'
    ];

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

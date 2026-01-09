import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedEmployees(prisma: PrismaClient) {
    console.log('--- Seeding Employees ---');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Fetch dependencies
    const departments = await prisma.department.findMany({ select: { id: true } });
    const positions = await prisma.employeePosition.findMany({ select: { id: true } });
    const shifts = await prisma.shift.findMany({ select: { id: true } });

    if (departments.length === 0 || positions.length === 0 || shifts.length === 0) {
        console.warn('Missing dependencies for Employee seeding (Depts/Pos/Shifts). Skipping.');
        return;
    }

    const deptIds = departments.map(d => d.id);
    const posIds = positions.map(p => p.id);
    const shiftIds = shifts.map(s => s.id);

    for (let i = 1; i <= 10; i++) {
        const email = `employee${i}@example.com`;
        const code = `EMP${1000 + i}`;

        let user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
        if (!user) {
            console.log(`Creating User for Employee ${i}`);
            user = await prisma.user.create({
                data: {
                    username: `employee${i}`,
                    email,
                    password: hashedPassword,
                },
                select: { id: true }
            });
        }

        const empExists = await prisma.employee.findUnique({
            where: { employeeCode: code },
            select: { id: true }
        });

        if (!empExists) {
            console.log(`Creating Employee ${code}`);
            await prisma.employee.create({
                data: {
                    userId: user.id,
                    employeeCode: code,
                    firstname: `Employee`,
                    lastname: `${i}`,
                    gender: i % 2,
                    dob: new Date('1990-01-01'),
                    hireDate: new Date(),
                    departmentId: deptIds[i % deptIds.length],
                    positionId: posIds[i % posIds.length],
                    shiftId: shiftIds[i % shiftIds.length]
                },
                select: { id: true }
            });
        }
    }
}

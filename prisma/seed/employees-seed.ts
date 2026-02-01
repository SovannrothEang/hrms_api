import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RoleName } from './../../src/common/enums/roles.enum';

export async function seedEmployees(prisma: PrismaClient) {
    console.log('--- Seeding Employees ---');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Fetch dependencies
    const departments = await prisma.department.findMany({ select: { id: true } });
    const positions = await prisma.employeePosition.findMany({ select: { id: true } });
    const shifts = await prisma.shift.findMany({ select: { id: true } });
    const employeeRole = await prisma.role.findFirst({ where: { name: RoleName.EMPLOYEE }, select: { id: true } });

    if (departments.length === 0 || positions.length === 0 || shifts.length === 0 || !employeeRole) {
        console.warn('Missing dependencies for Employee seeding (Depts/Pos/Shifts/Role). Skipping.');
        return;
    }

    const deptIds = departments.map(d => d.id);
    const posIds = positions.map(p => p.id);
    const shiftIds = shifts.map(s => s.id);

    const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'Robert', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Margaret', 'Matthew', 'Lisa', 'Anthony', 'Betty', 'Mark', 'Dorothy', 'Donald', 'Sandra', 'Paul', 'Ashley', 'Steven', 'Kimberly', 'George', 'Donna', 'Kenneth', 'Carol', 'Andrew', 'Michelle', 'Joshua', 'Emily', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'Edward', 'Deborah', 'Ronald', 'Stephanie'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

    for (let i = 0; i < 50; i++) {
        const email = `employee${i + 1}@example.com`;
        const code = `EMP${1001 + i}`;
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];

        let user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
        if (!user) {
            console.log(`Creating User for Employee ${i + 1}`);
            user = await prisma.user.create({
                data: {
                    username: `employee${i + 1}`,
                    email,
                    password: hashedPassword,
                    userRoles: {
                        create: { roleId: employeeRole.id }
                    }
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
                    firstname: firstName,
                    lastname: lastName,
                    gender: i % 2,
                    dob: new Date(1970 + (i % 30), i % 12, (i % 28) + 1),
                    hireDate: new Date(2020 + (i % 5), i % 12, (i % 28) + 1),
                    departmentId: deptIds[i % deptIds.length],
                    positionId: posIds[i % posIds.length],
                    shiftId: shiftIds[i % shiftIds.length],
                    status: 'ACTIVE',
                    employmentType: 'FULL_TIME',
                    salary: 2000 + (i * 100)
                },
                select: { id: true }
            });
        }
    }
}

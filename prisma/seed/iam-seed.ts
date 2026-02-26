import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../../src/common/enums/roles.enum';

export async function seedIam(prisma: PrismaClient) {
    console.log('--- Seeding IAM (Roles & Admin) ---');

    // 1. Roles
    const roles = [RoleName.ADMIN, RoleName.EMPLOYEE, RoleName.HR_MANAGER, RoleName.HRMS_API];
    const roleIds: Record<string, string> = {};

    for (const roleName of roles) {
        let role = await prisma.role.findFirst({
            where: { name: roleName },
            select: { id: true, name: true }
        });

        if (!role) {
            console.log(`Creating Role: ${roleName}`);
            role = await prisma.role.create({
                data: { name: roleName },
                select: { id: true, name: true }
            });
        }
        roleIds[roleName] = role.id;
    }

    // 2. Admin User
    const adminEmail = 'admin@example.com';
    const adminUsername = 'admin';

    const existingAdmin = await prisma.user.findFirst({
        where: {
            OR: [{ email: adminEmail }, { username: adminUsername }]
        },
        select: { id: true }
    });

    if (!existingAdmin) {
        console.log('Creating Admin User...');
        const hashedPassword = await bcrypt.hash('Admin123!', 12);
        await prisma.user.create({
            data: {
                email: adminEmail,
                username: adminUsername,
                password: hashedPassword,
                isActive: true,
                userRoles: {
                    create: { roleId: roleIds[RoleName.ADMIN] }
                }
            },
            select: { id: true }
        });
    } else {
        console.log('Admin user already exists.');
    }

    // 3. Machine User (HRMS_API)
    const machineEmail = 'machine@example.com';
    const machineUsername = 'machine';

    const existingMachine = await prisma.user.findFirst({
        where: {
            OR: [{ email: machineEmail }, { username: machineUsername }]
        },
        select: { id: true }
    });

    if (!existingMachine) {
        console.log('Creating Machine User...');
        const hashedPassword = await bcrypt.hash('Machine123!', 12);
        await prisma.user.create({
            data: {
                email: machineEmail,
                username: machineUsername,
                password: hashedPassword,
                isActive: true,
                userRoles: {
                    create: { roleId: roleIds[RoleName.HRMS_API] }
                }
            },
            select: { id: true }
        });
    } else {
        console.log('Machine user already exists.');
    }
}

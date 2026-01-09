import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../../src/common/enums/roles.enum';

export async function seedIam(prisma: PrismaClient) {
    console.log('--- Seeding IAM (Roles & Admin) ---');

    // 1. Roles
    const roles = [RoleName.ADMIN, RoleName.EMPLOYEE, RoleName.HR];
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
}

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    // 1. Seed Admin Role
    const adminRoleName = 'admin';
    let adminRole = await prisma.role.findUnique({
        where: { name: adminRoleName },
    });

    if (!adminRole) {
        console.log(`Role '${adminRoleName}' not found. Creating...`);
        adminRole = await prisma.role.create({
            data: {
                name: adminRoleName,
                // performBy: null // System action
            },
        });
        console.log(`Role '${adminRoleName}' created.`);
    } else {
        console.log(`Role '${adminRoleName}' already exists.`);
    }

    // 2. Seed Admin User
    const adminEmail = 'admin@example.com';
    const adminUsername = 'admin';

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: adminEmail },
                { username: adminUsername }
            ]
        }
    });

    if (!existingUser) {
        console.log(`Admin user not found. Creating...`);
        const hashedPassword = await bcrypt.hash('Admin123!', 12);

        await prisma.user.create({
            data: {
                email: adminEmail,
                username: adminUsername,
                password: hashedPassword,
                isActive: true,
                userRoles: {
                    create: {
                        roleId: adminRole.id,
                        // assignedBy: null // System action
                    }
                }
            },
        });
    } else {
        console.log(`Admin user already exists.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

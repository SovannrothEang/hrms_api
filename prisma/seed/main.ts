require('dotenv').config();
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedIam } from './iam-seed';
import { seedDepartments } from './departments-seed';
import { seedPositions } from './positions-seed';
import { seedShifts } from './shifts-seed';
import { seedHolidays } from './holidays-seed';
import { seedPayroll } from './payroll-seed';
import { seedEmployees } from './employees-seed';
import { seedAttendances } from './attendances-seed';
import { seedLeaves } from './leaves-seed';
import { seedPayrollRecords } from './payroll-records-seed';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting ALL seeds...');

    await seedIam(prisma);
    await seedDepartments(prisma);
    await seedPositions(prisma);
    await seedShifts(prisma);
    await seedHolidays(prisma);
    await seedPayroll(prisma);

    // Dependencies on above
    await seedEmployees(prisma);

    // Dependencies on Employees
    await seedLeaves(prisma);
    await seedAttendances(prisma);
    await seedPayrollRecords(prisma);

    console.log('All seeds completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

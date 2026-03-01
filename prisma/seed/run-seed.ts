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

const availableSeeds: Record<string, (prisma: PrismaClient) => Promise<void>> =
    {
        iam: seedIam,
        departments: seedDepartments,
        positions: seedPositions,
        shifts: seedShifts,
        holidays: seedHolidays,
        payroll: seedPayroll,
        employees: seedEmployees,
        attendances: seedAttendances,
        leaves: seedLeaves,
        'payroll-records': seedPayrollRecords,
    };

const dependencies: Record<string, string[]> = {
    employees: [
        'iam',
        'departments',
        'positions',
        'shifts',
        'holidays',
        'payroll',
    ],
    attendances: ['employees'],
    leaves: ['employees'],
    'payroll-records': ['employees', 'payroll'],
};

async function runSeed(seedName: string, executed: Set<string> = new Set()) {
    if (executed.has(seedName)) {
        return;
    }

    const seedFn = availableSeeds[seedName];
    if (!seedFn) {
        console.error(`Unknown seed: ${seedName}`);
        console.error(
            `Available seeds: ${Object.keys(availableSeeds).join(', ')}`,
        );
        process.exit(1);
    }

    // Run dependencies first
    const deps = dependencies[seedName] || [];
    for (const dep of deps) {
        await runSeed(dep, executed);
    }

    console.log(`Running seed: ${seedName}...`);
    await seedFn(prisma);
    executed.add(seedName);
    console.log(`Completed: ${seedName}`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(
            'Usage: pnpm run seed:<name> or npx ts-node prisma/seed/run-seed.ts <name>',
        );
        console.log('');
        console.log('Available seeds:');
        Object.keys(availableSeeds).forEach((name) => {
            const deps = dependencies[name]
                ? ` (deps: ${dependencies[name].join(', ')})`
                : '';
            console.log(`  - ${name}${deps}`);
        });
        console.log('');
        console.log('Examples:');
        console.log('  pnpm run seed:iam');
        console.log('  pnpm run seed:employees');
        console.log('  pnpm run seed:payroll-records');
        process.exit(0);
    }

    const seedName = args[0];

    try {
        await runSeed(seedName);
        console.log(`Seed "${seedName}" completed successfully.`);
    } catch (error) {
        console.error(`Failed to run seed "${seedName}":`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

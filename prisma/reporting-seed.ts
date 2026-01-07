require('dotenv').config();
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceStatus } from '../src/common/enums/attendance-status.enum';
import { LeaveType } from '../src/common/enums/leave-type.enum';
import { LeaveStatus } from '../src/common/enums/leave-status.enum';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting reporting seed...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Ensure Departments
    const depts = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance'];
    const deptIds: string[] = [];
    for (const name of depts) {
        // Upsert to avoid dupes
        const exists = await prisma.department.findFirst({ where: { departmentName: name } });
        if (exists) {
            deptIds.push(exists.id);
        } else {
            const d = await prisma.department.create({ data: { departmentName: name } });
            deptIds.push(d.id);
        }
    }

    // 2. Ensure Positions
    const positions = ['Manager', 'Senior Associate', 'Junior Associate', 'Intern'];
    const posIds: string[] = [];
    for (const title of positions) {
        const exists = await prisma.employeePosition.findFirst({ where: { title } });
        if (exists) {
            posIds.push(exists.id);
        } else {
            const p = await prisma.employeePosition.create({
                data: {
                    title,
                    salaryRangeMin: 1000,
                    salaryRangeMax: 5000
                }
            });
            posIds.push(p.id);
        }
    }

    // 3. Create Employees
    const employees: any[] = [];
    for (let i = 1; i <= 10; i++) {
        const email = `employee${i}@example.com`;
        const code = `EMP${1000 + i}`;

        let user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    username: `employee${i}`,
                    email,
                    password: hashedPassword,
                }
            });
        }

        let emp = await prisma.employee.findUnique({ where: { employeeCode: code } });
        if (!emp) {
            emp = await prisma.employee.create({
                data: {
                    userId: user.id,
                    employeeCode: code,
                    firstname: `Employee`,
                    lastname: `${i}`,
                    gender: i % 2,
                    dob: new Date('1990-01-01'),
                    hireDate: new Date(),
                    departmentId: deptIds[i % deptIds.length],
                    positionId: posIds[i % posIds.length]
                }
            });
        }
        if (emp) employees.push(emp);
    }

    console.log(`Ensured ${employees.length} employees.`);

    // 4. Generate Attendance for Current Month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (const emp of employees) {
        for (let d = 1; d <= daysInMonth; d++) {
            // skip today/future
            const date = new Date(year, month, d);
            if (date > now) continue;

            // skip weekends
            const day = date.getDay();
            if (day === 0 || day === 6) continue;

            // Random status
            const rand = Math.random();
            let status = AttendanceStatus.PRESENT;
            let checkIn: Date | null = new Date(date);
            checkIn.setHours(9, 0, 0);
            let checkOut: Date | null = new Date(date);
            checkOut.setHours(18, 0, 0);

            if (rand > 0.8) {
                status = AttendanceStatus.LATE;
                checkIn.setHours(9, 30, 0);
            } else if (rand > 0.95) {
                status = AttendanceStatus.ABSENT;
                checkIn = null;
                checkOut = null;
            }

            // Check duplicate
            const exists = await prisma.attendance.findFirst({
                where: { employeeId: emp.id, date: date }
            });

            if (!exists) {
                await prisma.attendance.create({
                    data: {
                        employeeId: emp.id,
                        date: date,
                        status: status,
                        checkInTime: checkIn, // Prisma allows Date | null
                        checkOutTime: checkOut
                    }
                });
            }
        }
    }
    console.log('Attendance seeded.');

    // 5. Leave Balances & Requests
    for (const emp of employees) {
        // Balances
        const bal = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveType_year: {
                    employeeId: emp.id,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    year: year
                }
            }
        });

        if (!bal) {
            await prisma.leaveBalance.create({
                data: {
                    employeeId: emp.id,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    year: year,
                    totalDays: 18,
                    usedDays: 2,
                    pendingDays: 0
                }
            });
        }

        // Create some requests
        const reqExists = await prisma.leaveRequest.findFirst({ where: { employeeId: emp.id } });
        if (!reqExists) {
            // Past Approved
            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: new Date(year, month - 1, 10),
                    endDate: new Date(year, month - 1, 12),
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    status: LeaveStatus.APPROVED,
                    reason: 'Vacation'
                }
            });
            // Future Pending
            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: new Date(year, month + 1, 5),
                    endDate: new Date(year, month + 1, 6),
                    leaveType: LeaveType.SICK_LEAVE,
                    status: LeaveStatus.PENDING,
                    reason: 'Doctor appt'
                }
            });
        }
    }
    console.log('Leave data seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

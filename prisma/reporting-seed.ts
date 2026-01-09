require('dotenv').config();
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

    const now = new Date();
    const year = now.getFullYear();

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

    // 3. Ensure Shifts
    const shiftsData = [
        { name: 'Morning Shift', start: '09:00', end: '18:00', grace: 15 },
        { name: 'Evening Shift', start: '14:00', end: '23:00', grace: 15 }
    ];
    const shiftIds: string[] = [];

    // Helper to fix time for DB (dummy date)
    const toTime = (timeStr: string) => new Date(`1970-01-01T${timeStr}:00Z`);

    for (const s of shiftsData) {
        let shift = await prisma.shift.findFirst({ where: { name: s.name } });
        if (!shift) {
            shift = await prisma.shift.create({
                data: {
                    name: s.name,
                    startTime: toTime(s.start),
                    endTime: toTime(s.end),
                    workDays: '1,2,3,4,5',
                    gracePeriodMins: s.grace
                }
            });
        }
        shiftIds.push(shift.id);
    }
    console.log(`Ensured ${shiftIds.length} shifts.`);

    // 4. Ensure Public Holidays
    const holidaysData = [
        { name: 'New Year', date: `${year}-01-01` },
        { name: 'Labor Day', date: `${year}-05-01` },
        { name: 'Independence Day', date: `${year}-07-04` } // Example
    ];

    for (const h of holidaysData) {
        const d = new Date(h.date);
        let holiday = await prisma.publicHoliday.findFirst({ where: { date: d } });
        if (!holiday) {
            await prisma.publicHoliday.create({
                data: {
                    name: h.name,
                    date: d,
                    isRecurring: true
                }
            });
        }
    }
    console.log(`Ensured ${holidaysData.length} public holidays.`);

    // 5. Create Employees with Shifts
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
                    positionId: posIds[i % posIds.length],
                    shiftId: shiftIds[i % shiftIds.length] // Assign shift round-robin
                }
            });
        }
        if (emp) employees.push(emp);
    }

    console.log(`Ensured ${employees.length} employees.`);

    // 6. Generate Attendance for Current Month
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

            // Check if Public Holiday
            const isHoliday = await prisma.publicHoliday.findFirst({
                where: { date: date }
            });
            if (isHoliday) continue;

            // Random status
            const rand = Math.random();
            let status = AttendanceStatus.PRESENT;

            // Determine shift start
            const shiftIdx = parseInt(emp.lastname) % 2 == 0 ? 1 : 0; // rough logic matching creation
            // Better: fetch emp shift
            // but for speed assuming data consistency or simple random

            let checkIn: Date | null = new Date(date);
            checkIn.setHours(9, 0, 0); // Default
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
                        checkInTime: checkIn,
                        checkOutTime: checkOut
                    }
                });
            }
        }
    }
    console.log('Attendance seeded.');

    // 7. Leave Balances & Requests
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

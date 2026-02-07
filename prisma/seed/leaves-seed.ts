import { PrismaClient } from '@prisma/client';
import { LeaveType } from '../../src/common/enums/leave-type.enum';
import { LeaveStatus } from '../../src/common/enums/leave-status.enum';

export async function seedLeaves(prisma: PrismaClient) {
    console.log('--- Seeding Leaves ---');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const employees = await prisma.employee.findMany({ select: { id: true } });

    // Create leave requests specifically for TODAY
    console.log('--- Seeding TODAY leave requests ---');

    // Use UTC date to match database storage
    const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    console.log('Today (UTC):', today.toISOString());

    // Employees 21-30: On approved leave today
    const onLeaveEmployees = employees.slice(20, 30);
    for (const emp of onLeaveEmployees) {
        // Check if there's already an approved leave covering today
        const existingLeave = await prisma.leaveRequest.findFirst({
            where: {
                employeeId: emp.id,
                status: LeaveStatus.APPROVED,
                startDate: { lte: today },
                endDate: { gte: today },
            },
            select: { id: true },
        });

        if (!existingLeave) {
            const endDate = new Date(today);
            endDate.setUTCDate(endDate.getUTCDate() + 2);

            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: today,
                    endDate: endDate,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    status: LeaveStatus.APPROVED,
                    reason: 'Personal time off',
                },
                select: { id: true },
            });
            console.log(
                `Created APPROVED leave for employee ${emp.id} starting today`,
            );
        } else {
            console.log(
                `Approved leave already exists for employee ${emp.id} today`,
            );
        }
    }

    // Employees 31-40: Pending leave requests
    const pendingEmployees = employees.slice(30, 40);
    for (const emp of pendingEmployees) {
        // Check if there's already a pending request
        const existingPending = await prisma.leaveRequest.findFirst({
            where: {
                employeeId: emp.id,
                status: LeaveStatus.PENDING,
            },
            select: { id: true },
        });

        if (!existingPending) {
            const startDate = new Date(today);
            startDate.setUTCDate(startDate.getUTCDate() + 3);
            const endDate = new Date(startDate);
            endDate.setUTCDate(endDate.getUTCDate() + 2);

            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: startDate,
                    endDate: endDate,
                    leaveType: LeaveType.SICK_LEAVE,
                    status: LeaveStatus.PENDING,
                    reason: 'Medical appointment',
                },
                select: { id: true },
            });
            console.log(`Created PENDING leave request for employee ${emp.id}`);
        } else {
            console.log(
                `Pending request already exists for employee ${emp.id}`,
            );
        }
    }

    // Regular seeding for all employees
    for (const emp of employees) {
        // Balances
        const bal = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveType_year: {
                    employeeId: emp.id,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    year: year,
                },
            },
            select: { id: true },
        });

        if (!bal) {
            await prisma.leaveBalance.create({
                data: {
                    employeeId: emp.id,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    year: year,
                    totalDays: 18,
                    usedDays: 2,
                    pendingDays: 0,
                },
                select: { id: true },
            });
        }

        // Requests
        const reqExists = await prisma.leaveRequest.findFirst({
            where: { employeeId: emp.id },
            select: { id: true },
        });

        if (!reqExists) {
            // Past Approved
            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: new Date(year, month - 1, 10),
                    endDate: new Date(year, month - 1, 12),
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    status: LeaveStatus.APPROVED,
                    reason: 'Vacation',
                },
                select: { id: true },
            });
            // Future Pending
            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: new Date(year, month + 1, 5),
                    endDate: new Date(year, month + 1, 6),
                    leaveType: LeaveType.SICK_LEAVE,
                    status: LeaveStatus.PENDING,
                    reason: 'Doctor appt',
                },
                select: { id: true },
            });
        }
    }
}

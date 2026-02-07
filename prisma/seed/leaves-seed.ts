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

    // Realistic leave distribution for 50 employees:
    // - 2-3 employees on approved leave today (~5%)
    // - 2-3 employees with pending requests (~5%)
    // - 1-2 employees with rejected requests (~3%)
    console.log(
        `Creating realistic leave distribution for ${employees.length} employees`,
    );

    // Employees 5-7: On approved leave today (3 employees)
    const onLeaveEmployees = employees.slice(4, 7);
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
            endDate.setUTCDate(
                endDate.getUTCDate() + Math.floor(Math.random() * 3) + 1,
            ); // 1-3 days

            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: today,
                    endDate: endDate,
                    leaveType:
                        Math.random() > 0.5
                            ? LeaveType.ANNUAL_LEAVE
                            : LeaveType.SICK_LEAVE,
                    status: LeaveStatus.APPROVED,
                    reason:
                        Math.random() > 0.5
                            ? 'Personal time off'
                            : 'Medical appointment',
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

    // Employees 8-10: Pending leave requests (3 employees)
    const pendingEmployees = employees.slice(7, 10);
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
            startDate.setUTCDate(
                startDate.getUTCDate() + Math.floor(Math.random() * 7) + 3,
            ); // 3-9 days from now
            const endDate = new Date(startDate);
            endDate.setUTCDate(
                endDate.getUTCDate() + Math.floor(Math.random() * 3) + 1,
            ); // 1-3 days

            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: startDate,
                    endDate: endDate,
                    leaveType:
                        Math.random() > 0.5
                            ? LeaveType.ANNUAL_LEAVE
                            : LeaveType.SICK_LEAVE,
                    status: LeaveStatus.PENDING,
                    reason:
                        Math.random() > 0.5
                            ? 'Vacation planning'
                            : 'Doctor appointment',
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

    // Employees 11-12: Rejected leave requests (2 employees)
    const rejectedEmployees = employees.slice(10, 12);
    for (const emp of rejectedEmployees) {
        const existingRejected = await prisma.leaveRequest.findFirst({
            where: {
                employeeId: emp.id,
                status: LeaveStatus.REJECTED,
            },
            select: { id: true },
        });

        if (!existingRejected) {
            const startDate = new Date(today);
            startDate.setUTCDate(
                startDate.getUTCDate() - Math.floor(Math.random() * 14) - 7,
            ); // 7-20 days ago
            const endDate = new Date(startDate);
            endDate.setUTCDate(
                endDate.getUTCDate() + Math.floor(Math.random() * 3) + 1,
            ); // 1-3 days

            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: startDate,
                    endDate: endDate,
                    leaveType:
                        Math.random() > 0.5
                            ? LeaveType.ANNUAL_LEAVE
                            : LeaveType.SICK_LEAVE,
                    status: LeaveStatus.REJECTED,
                    reason:
                        Math.random() > 0.5
                            ? 'Vacation request (rejected: insufficient balance)'
                            : 'Sick leave (rejected: staffing requirements)',
                },
                select: { id: true },
            });
            console.log(
                `Created REJECTED leave request for employee ${emp.id}`,
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
            // Past Approved (1 month ago)
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
            // Future Pending (next month)
            await prisma.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate: new Date(year, month + 1, 5),
                    endDate: new Date(year, month + 1, 6),
                    leaveType: LeaveType.SICK_LEAVE,
                    status: LeaveStatus.PENDING,
                    reason: 'Doctor appointment',
                },
                select: { id: true },
            });
        }
    }
}

import { PrismaClient } from '@prisma/client';
import { LeaveType } from '../../src/common/enums/leave-type.enum';
import { LeaveStatus } from '../../src/common/enums/leave-status.enum';

export async function seedLeaves(prisma: PrismaClient) {
    console.log('--- Seeding Leaves ---');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const employees = await prisma.employee.findMany({ select: { id: true } });

    for (const emp of employees) {
        // Balances
        const bal = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveType_year: {
                    employeeId: emp.id,
                    leaveType: LeaveType.ANNUAL_LEAVE,
                    year: year
                }
            },
            select: { id: true }
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
                },
                select: { id: true }
            });
        }

        // Requests
        const reqExists = await prisma.leaveRequest.findFirst({
            where: { employeeId: emp.id },
            select: { id: true }
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
                    reason: 'Vacation'
                },
                select: { id: true }
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
                },
                select: { id: true }
            });
        }
    }
}

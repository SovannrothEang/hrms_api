import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

@Injectable()
export class AutomationService {
    private readonly logger = new Logger(AutomationService.name);

    constructor(private readonly prisma: PrismaService) { }

    // Run every day at 23:59:00
    @Cron('0 59 23 * * *')
    async handleAutoCheckout() {
        this.logger.log('Starting Auto-Checkout Job...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeAttendances = await this.prisma.attendance.findMany({
            where: {
                date: today,
                checkOutTime: null,
            },
        });

        for (const attendance of activeAttendances) {
            await this.prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    status: AttendanceStatus.DID_NOT_CHECKOUT,
                    // If checkOutTime is null at end of day, we might set it to 23:59 or leave null but update status
                },
            });
            this.logger.log(`Auto-marked checkout for Attendance ${attendance.id}`);
        }
        this.logger.log('Auto-Checkout Job Completed.');
    }

    // Run every day at 18:00:00 (Example end of shift)
    // In a real app, this should be dynamic per employee shift
    @Cron('0 0 18 * * *')
    async handleAbsentMarking() {
        this.logger.log('Starting Absent Marking Job...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all active employees
        const employees = await this.prisma.employee.findMany({
            where: { isActive: true },
        });

        for (const employee of employees) {
            // Check if attendance exists
            const attendance = await this.prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    date: today,
                },
            });

            // Check if on leave
            const onLeave = await this.prisma.leaveRequest.findFirst({
                where: {
                    employeeId: employee.id,
                    startDate: { lte: today },
                    endDate: { gte: today },
                    status: 'APPROVED'
                }
            });

            if (!attendance && !onLeave) {
                await this.prisma.attendance.create({
                    data: {
                        employeeId: employee.id,
                        date: today,
                        status: AttendanceStatus.ABSENT,
                        checkInTime: null,
                        checkOutTime: null,
                    },
                });
                this.logger.log(`Marked Employee ${employee.id} as ABSENT`);
            }
        }
        this.logger.log('Absent Marking Job Completed.');
    }
}

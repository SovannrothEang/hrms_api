import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async getAttendanceSummaryData(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const summary = await this.prisma.attendance.groupBy({
            by: ['status'],
            where: {
                date: { gte: startDate, lte: endDate },
            },
            _count: { id: true },
        });

        return summary.map((item) => ({
            status: item.status,
            count: item._count.id,
        }));
    }

    async getLeaveUtilizationData() {
        const balances = await this.prisma.leaveBalance.findMany({
            include: {
                employee: {
                    select: {
                        firstname: true,
                        lastname: true,
                        employeeCode: true,
                        department: { select: { departmentName: true } },
                    },
                },
            },
        });

        return balances.map((b) => ({
            employee: `${b.employee.firstname} ${b.employee.lastname}`,
            code: b.employee.employeeCode,
            department: b.employee.department.departmentName,
            type: b.leaveType,
            year: b.year,
            total: Number(b.totalDays),
            used: Number(b.usedDays),
            pending: Number(b.pendingDays),
            remaining:
                Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays),
        }));
    }

    async exportAttendanceSummary(month: number, year: number) {
        const data = await this.getAttendanceSummaryData(month, year);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Attendance Summary');

        sheet.columns = [
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Count', key: 'count', width: 10 },
        ];

        data.forEach((d) => sheet.addRow(d));

        return workbook;
    }

    async exportLeaveUtilization() {
        const data = await this.getLeaveUtilizationData();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Leave Utilization');

        sheet.columns = [
            { header: 'Employee Code', key: 'code', width: 15 },
            { header: 'Name', key: 'employee', width: 25 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Leave Type', key: 'type', width: 20 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Total', key: 'total', width: 10 },
            { header: 'Used', key: 'used', width: 10 },
            { header: 'Pending', key: 'pending', width: 10 },
            { header: 'Remaining', key: 'remaining', width: 10 },
        ];

        data.forEach((d) => sheet.addRow(d));
        return workbook;
    }
}

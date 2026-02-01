import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { ResultPagination } from '../../common/logic/result-pagination';

export interface EmployeeReportData {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    department: string;
    position: string;
    status: string;
    employmentType: string;
    hireDate: Date;
    salary: number | null;
}

export interface PayrollReportData {
    id: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    basicSalary: number;
    overtimePay: number;
    bonus: number;
    deductions: number;
    netSalary: number;
    status: string;
}

export interface ComprehensiveReportData {
    totalEmployees: number;
    activeEmployees: number;
    departmentBreakdown: { department: string; count: number }[];
    payrollSummary: {
        totalPayrolls: number;
        totalNetSalary: number;
        pendingPayrolls: number;
        processedPayrolls: number;
    };
    attendanceSummary: {
        totalPresent: number;
        totalLate: number;
        totalAbsent: number;
        averageWorkHours: number;
    };
    leaveRequests: {
        pending: number;
        approved: number;
        rejected: number;
    };
}

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAttendanceSummaryData(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const summary = await this.prisma.client.attendance.groupBy({
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
        const balances = await this.prisma.client.leaveBalance.findMany({
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
                Number(b.totalDays) -
                Number(b.usedDays) -
                Number(b.pendingDays),
        }));
    }

    async getPaginatedLeaveUtilization(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [total, balances] = await Promise.all([
            this.prisma.client.leaveBalance.count(),
            this.prisma.client.leaveBalance.findMany({
                skip,
                take: limit,
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
            }),
        ]);

        const data = balances.map((b) => ({
            employee: `${b.employee.firstname} ${b.employee.lastname}`,
            code: b.employee.employeeCode,
            department: b.employee.department.departmentName,
            type: b.leaveType,
            year: b.year,
            total: Number(b.totalDays),
            used: Number(b.usedDays),
            pending: Number(b.pendingDays),
            remaining:
                Number(b.totalDays) -
                Number(b.usedDays) -
                Number(b.pendingDays),
        }));

        return ResultPagination.of(data, total, page, limit);
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

    async getPaginatedEmployeeReport(
        page: number,
        limit: number,
        params?: {
            departmentId?: string;
            status?: string;
        },
    ): Promise<ResultPagination<EmployeeReportData>> {
        const skip = (page - 1) * limit;
        const where: {
            isDeleted: boolean;
            departmentId?: string;
            status?:
                | 'ACTIVE'
                | 'INACTIVE'
                | 'ON_LEAVE'
                | 'PROBATION'
                | 'TERMINATED';
        } = {
            isDeleted: false,
        };

        if (params?.departmentId) {
            where.departmentId = params.departmentId;
        }

        if (params?.status) {
            where.status = params.status as typeof where.status;
        }

        const [total, employees] = await Promise.all([
            this.prisma.client.employee.count({ where }),
            this.prisma.client.employee.findMany({
                where,
                skip,
                take: limit,
                include: {
                    department: { select: { departmentName: true } },
                    position: { select: { title: true } },
                    user: { select: { email: true } },
                },
                orderBy: { employeeCode: 'asc' },
            }),
        ]);

        const data = employees.map((e) => ({
            id: e.id,
            employeeCode: e.employeeCode,
            fullName: `${e.firstname} ${e.lastname}`,
            email: e.user?.email ?? '',
            department: e.department.departmentName,
            position: e.position.title,
            status: e.status,
            employmentType: e.employmentType,
            hireDate: e.hireDate,
            salary: e.salary ? Number(e.salary) : null,
        }));

        return ResultPagination.of(data, total, page, limit);
    }

    async getEmployeeReportData(params?: {
        departmentId?: string;
        status?: string;
    }): Promise<EmployeeReportData[]> {
        const where: {
            isDeleted: boolean;
            departmentId?: string;
            status?:
                | 'ACTIVE'
                | 'INACTIVE'
                | 'ON_LEAVE'
                | 'PROBATION'
                | 'TERMINATED';
        } = {
            isDeleted: false,
        };

        if (params?.departmentId) {
            where.departmentId = params.departmentId;
        }

        if (params?.status) {
            where.status = params.status as typeof where.status;
        }

        const employees = await this.prisma.client.employee.findMany({
            where,
            include: {
                department: { select: { departmentName: true } },
                position: { select: { title: true } },
                user: { select: { email: true } },
            },
            orderBy: { employeeCode: 'asc' },
        });

        return employees.map((e) => ({
            id: e.id,
            employeeCode: e.employeeCode,
            fullName: `${e.firstname} ${e.lastname}`,
            email: e.user?.email ?? '',
            department: e.department.departmentName,
            position: e.position.title,
            status: e.status,
            employmentType: e.employmentType,
            hireDate: e.hireDate,
            salary: e.salary ? Number(e.salary) : null,
        }));
    }

    async getPaginatedPayrollReport(
        page: number,
        limit: number,
        params?: {
            year?: number;
            month?: number;
            departmentId?: string;
            status?: string;
        },
    ): Promise<ResultPagination<PayrollReportData>> {
        const skip = (page - 1) * limit;
        const where: {
            isDeleted: boolean;
            payPeriodStart?: { gte?: Date; lte?: Date };
            status?: string;
            employee?: { departmentId?: string };
        } = {
            isDeleted: false,
        };

        if (params?.year && params?.month) {
            const startOfMonth = new Date(params.year, params.month - 1, 1);
            const endOfMonth = new Date(params.year, params.month, 0);
            where.payPeriodStart = {
                gte: startOfMonth,
                lte: endOfMonth,
            };
        } else if (params?.year) {
            const startOfYear = new Date(params.year, 0, 1);
            const endOfYear = new Date(params.year, 11, 31);
            where.payPeriodStart = {
                gte: startOfYear,
                lte: endOfYear,
            };
        }

        if (params?.status) {
            where.status = params.status;
        }

        if (params?.departmentId) {
            where.employee = { departmentId: params.departmentId };
        }

        const [total, payrolls] = await Promise.all([
            this.prisma.client.payroll.count({ where }),
            this.prisma.client.payroll.findMany({
                where,
                skip,
                take: limit,
                include: {
                    employee: {
                        select: {
                            employeeCode: true,
                            firstname: true,
                            lastname: true,
                            department: { select: { departmentName: true } },
                        },
                    },
                },
                orderBy: [{ payPeriodStart: 'desc' }, { createdAt: 'desc' }],
            }),
        ]);

        const data = payrolls.map((p) => ({
            id: p.id,
            employeeCode: p.employee.employeeCode,
            employeeName: `${p.employee.firstname} ${p.employee.lastname}`,
            department: p.employee.department.departmentName,
            payPeriodStart: p.payPeriodStart,
            payPeriodEnd: p.payPeriodEnd,
            basicSalary: Number(p.basicSalary),
            overtimePay: Number(p.overtimeRate) * Number(p.overtimeHrs),
            bonus: Number(p.bonus),
            deductions: Number(p.deductions),
            netSalary: Number(p.netSalary),
            status: p.status,
        }));

        return ResultPagination.of(data, total, page, limit);
    }

    async getPayrollReportData(params?: {
        year?: number;
        month?: number;
        departmentId?: string;
        status?: string;
    }): Promise<PayrollReportData[]> {
        const where: {
            isDeleted: boolean;
            payPeriodStart?: { gte?: Date; lte?: Date };
            status?: string;
            employee?: { departmentId?: string };
        } = {
            isDeleted: false,
        };

        if (params?.year && params?.month) {
            const startOfMonth = new Date(params.year, params.month - 1, 1);
            const endOfMonth = new Date(params.year, params.month, 0);
            where.payPeriodStart = {
                gte: startOfMonth,
                lte: endOfMonth,
            };
        } else if (params?.year) {
            const startOfYear = new Date(params.year, 0, 1);
            const endOfYear = new Date(params.year, 11, 31);
            where.payPeriodStart = {
                gte: startOfYear,
                lte: endOfYear,
            };
        }

        if (params?.status) {
            where.status = params.status;
        }

        if (params?.departmentId) {
            where.employee = { departmentId: params.departmentId };
        }

        const payrolls = await this.prisma.client.payroll.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        firstname: true,
                        lastname: true,
                        department: { select: { departmentName: true } },
                    },
                },
            },
            orderBy: [{ payPeriodStart: 'desc' }, { createdAt: 'desc' }],
        });

        return payrolls.map((p) => ({
            id: p.id,
            employeeCode: p.employee.employeeCode,
            employeeName: `${p.employee.firstname} ${p.employee.lastname}`,
            department: p.employee.department.departmentName,
            payPeriodStart: p.payPeriodStart,
            payPeriodEnd: p.payPeriodEnd,
            basicSalary: Number(p.basicSalary),
            overtimePay: Number(p.overtimeRate) * Number(p.overtimeHrs),
            bonus: Number(p.bonus),
            deductions: Number(p.deductions),
            netSalary: Number(p.netSalary),
            status: p.status,
        }));
    }

    async getComprehensiveReportData(params?: {
        year?: number;
        month?: number;
    }): Promise<ComprehensiveReportData> {
        const currentYear = params?.year ?? new Date().getFullYear();
        const currentMonth = params?.month ?? new Date().getMonth() + 1;

        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const [
            totalEmployees,
            activeEmployees,
            departmentBreakdown,
            payrollStats,
            attendanceStats,
            leaveStats,
        ] = await Promise.all([
            this.prisma.client.employee.count({
                where: { isDeleted: false },
            }),
            this.prisma.client.employee.count({
                where: { isDeleted: false, isActive: true, status: 'ACTIVE' },
            }),
            this.prisma.client.employee.groupBy({
                by: ['departmentId'],
                where: { isDeleted: false },
                _count: { id: true },
            }),
            this.prisma.client.payroll.aggregate({
                where: {
                    isDeleted: false,
                    payPeriodStart: { gte: startDate, lte: endDate },
                },
                _count: { id: true },
                _sum: { netSalary: true },
            }),
            this.prisma.client.attendance.groupBy({
                by: ['status'],
                where: {
                    isDeleted: false,
                    date: { gte: startDate, lte: endDate },
                },
                _count: { id: true },
                _avg: { workHours: true },
            }),
            this.prisma.client.leaveRequest.groupBy({
                by: ['status'],
                where: {
                    isDeleted: false,
                    requestDate: { gte: startDate, lte: endDate },
                },
                _count: { id: true },
            }),
        ]);

        const departments = await this.prisma.client.department.findMany({
            where: { isDeleted: false },
            select: { id: true, departmentName: true },
        });

        const deptMap = new Map(
            departments.map((d) => [d.id, d.departmentName]),
        );

        const pendingPayrolls = await this.prisma.client.payroll.count({
            where: {
                isDeleted: false,
                status: 'PENDING',
                payPeriodStart: { gte: startDate, lte: endDate },
            },
        });

        const processedPayrolls = await this.prisma.client.payroll.count({
            where: {
                isDeleted: false,
                status: 'PROCESSED',
                payPeriodStart: { gte: startDate, lte: endDate },
            },
        });

        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        let avgWorkHours = 0;

        for (const stat of attendanceStats) {
            if (stat.status === 'PRESENT') {
                totalPresent = stat._count.id;
                avgWorkHours = Number(stat._avg.workHours ?? 0);
            } else if (stat.status === 'LATE') {
                totalLate = stat._count.id;
            } else if (stat.status === 'ABSENT') {
                totalAbsent = stat._count.id;
            }
        }

        let pendingLeaves = 0;
        let approvedLeaves = 0;
        let rejectedLeaves = 0;

        for (const stat of leaveStats) {
            if (stat.status === 'PENDING') {
                pendingLeaves = stat._count.id;
            } else if (stat.status === 'APPROVED') {
                approvedLeaves = stat._count.id;
            } else if (stat.status === 'REJECTED') {
                rejectedLeaves = stat._count.id;
            }
        }

        return {
            totalEmployees,
            activeEmployees,
            departmentBreakdown: departmentBreakdown.map((d) => ({
                department: deptMap.get(d.departmentId) ?? 'Unknown',
                count: d._count.id,
            })),
            payrollSummary: {
                totalPayrolls: payrollStats._count.id,
                totalNetSalary: Number(payrollStats._sum.netSalary ?? 0),
                pendingPayrolls,
                processedPayrolls,
            },
            attendanceSummary: {
                totalPresent,
                totalLate,
                totalAbsent,
                averageWorkHours: Math.round(avgWorkHours * 100) / 100,
            },
            leaveRequests: {
                pending: pendingLeaves,
                approved: approvedLeaves,
                rejected: rejectedLeaves,
            },
        };
    }

    async exportEmployeeReport(params?: {
        departmentId?: string;
        status?: string;
    }) {
        const data = await this.getEmployeeReportData(params);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Employee Report');

        sheet.columns = [
            { header: 'Employee Code', key: 'employeeCode', width: 15 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Position', key: 'position', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Employment Type', key: 'employmentType', width: 15 },
            { header: 'Hire Date', key: 'hireDate', width: 15 },
            { header: 'Salary', key: 'salary', width: 15 },
        ];

        data.forEach((d) => sheet.addRow(d));
        return workbook;
    }

    async exportPayrollReport(params?: {
        year?: number;
        month?: number;
        departmentId?: string;
        status?: string;
    }) {
        const data = await this.getPayrollReportData(params);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Payroll Report');

        sheet.columns = [
            { header: 'Employee Code', key: 'employeeCode', width: 15 },
            { header: 'Employee Name', key: 'employeeName', width: 25 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Period Start', key: 'payPeriodStart', width: 15 },
            { header: 'Period End', key: 'payPeriodEnd', width: 15 },
            { header: 'Basic Salary', key: 'basicSalary', width: 15 },
            { header: 'Overtime Pay', key: 'overtimePay', width: 15 },
            { header: 'Bonus', key: 'bonus', width: 15 },
            { header: 'Deductions', key: 'deductions', width: 15 },
            { header: 'Net Salary', key: 'netSalary', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        data.forEach((d) => sheet.addRow(d));
        return workbook;
    }
}

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

export interface AttendanceReportData {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    attendanceRate: number;
    averageWorkHours: number;
    totalOvertimeHours: number;
}

export interface EmployeeSummaryReportData {
    totalEmployees: number;
    activeEmployees: number;
    onLeaveEmployees: number;
    newHires: number;
    terminatedEmployees: number;
    departmentBreakdown: { department: string; count: number }[];
    positionBreakdown: { position: string; count: number }[];
}

export interface PayrollSummaryReportData {
    totalPayroll: number;
    averageSalary: number;
    totalDeductions: number;
    totalAllowances: number;
    departmentPayroll: { department: string; total: number }[];
    payrollTrend: { period: string; amount: number }[];
}

export interface LeaveReportData {
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    averageLeaveDays: number;
    leaveTypeBreakdown: { type: string; count: number }[];
    monthlyTrend: { month: string; count: number }[];
}

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

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

    private normalizeDateRange(startDate?: string, endDate?: string): {
        start: Date;
        end: Date;
    } {
        const now = new Date();
        const start = startDate
            ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = endDate
            ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }

    async getAttendanceReportData(params?: {
        startDate?: string;
        endDate?: string;
        employeeId?: string;
    }): Promise<AttendanceReportData> {
        const { start, end } = this.normalizeDateRange(
            params?.startDate,
            params?.endDate,
        );

        const whereClause: {
            isDeleted: boolean;
            date: { gte: Date; lte: Date };
            employeeId?: string;
        } = {
            isDeleted: false,
            date: { gte: start, lte: end },
        };

        if (params?.employeeId) {
            whereClause.employeeId = params.employeeId;
        }

        // Get attendance status counts
        const attendanceStats = await this.prisma.client.attendance.groupBy({
            by: ['status'],
            where: whereClause,
            _count: { id: true },
        });

        // Get work hours aggregation
        const workHoursAgg = await this.prisma.client.attendance.aggregate({
            where: whereClause,
            _avg: { workHours: true },
            _sum: { overtime: true },
        });

        // Count approved leave days within the date range
        const leaveWhereClause: {
            status: 'APPROVED';
            isDeleted: boolean;
            startDate: { lte: Date };
            endDate: { gte: Date };
            employeeId?: string;
        } = {
            status: 'APPROVED',
            isDeleted: false,
            startDate: { lte: end },
            endDate: { gte: start },
        };

        if (params?.employeeId) {
            leaveWhereClause.employeeId = params.employeeId;
        }

        const approvedLeaves =
            await this.prisma.client.leaveRequest.findMany({
                where: leaveWhereClause,
                select: {
                    startDate: true,
                    endDate: true,
                },
            });

        // Calculate total leave days (considering overlap with date range)
        let leaveDays = 0;
        for (const leave of approvedLeaves) {
            const leaveStart =
                leave.startDate > start ? leave.startDate : start;
            const leaveEnd = leave.endDate < end ? leave.endDate : end;
            const diffTime = leaveEnd.getTime() - leaveStart.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            leaveDays += Math.max(0, diffDays);
        }

        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;

        for (const stat of attendanceStats) {
            if (stat.status === 'PRESENT') {
                presentDays = stat._count.id;
            } else if (stat.status === 'ABSENT') {
                absentDays = stat._count.id;
            } else if (stat.status === 'LATE') {
                lateDays = stat._count.id;
            }
        }

        const totalDays = presentDays + absentDays + lateDays + leaveDays;
        const attendanceRate =
            totalDays > 0
                ? Math.round(((presentDays + lateDays) / totalDays) * 10000) /
                100
                : 0;

        return {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            leaveDays,
            attendanceRate,
            averageWorkHours:
                Math.round(
                    Number(workHoursAgg._avg?.workHours ?? 0) * 100,
                ) / 100,
            totalOvertimeHours: Number(workHoursAgg._sum?.overtime ?? 0),
        };
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

    async getEmployeeSummaryReportData(params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<EmployeeSummaryReportData> {
        const { start, end } = this.normalizeDateRange(
            params?.startDate,
            params?.endDate,
        );

        const [
            totalEmployees,
            activeEmployees,
            onLeaveEmployees,
            newHires,
            terminatedEmployees,
            departmentGroups,
            positionGroups,
        ] = await Promise.all([
            // Total employees (not deleted)
            this.prisma.client.employee.count({
                where: { isDeleted: false },
            }),
            // Active employees
            this.prisma.client.employee.count({
                where: { isDeleted: false, status: 'ACTIVE' },
            }),
            // On leave employees
            this.prisma.client.employee.count({
                where: { isDeleted: false, status: 'ON_LEAVE' },
            }),
            // New hires within date range
            this.prisma.client.employee.count({
                where: {
                    isDeleted: false,
                    hireDate: { gte: start, lte: end },
                },
            }),
            // Terminated employees (status is TERMINATED and updated within date range)
            this.prisma.client.employee.count({
                where: {
                    isDeleted: false,
                    status: 'TERMINATED',
                    updatedAt: { gte: start, lte: end },
                },
            }),
            // Department breakdown
            this.prisma.client.employee.groupBy({
                by: ['departmentId'],
                where: { isDeleted: false },
                _count: { id: true },
            }),
            // Position breakdown
            this.prisma.client.employee.groupBy({
                by: ['positionId'],
                where: { isDeleted: false },
                _count: { id: true },
            }),
        ]);

        // Get department names
        const departments = await this.prisma.client.department.findMany({
            where: { isDeleted: false },
            select: { id: true, departmentName: true },
        });
        const deptMap = new Map(
            departments.map((d) => [d.id, d.departmentName]),
        );

        // Get position names
        const positions = await this.prisma.client.employeePosition.findMany({
            where: { isDeleted: false },
            select: { id: true, title: true },
        });
        const posMap = new Map(positions.map((p) => [p.id, p.title]));

        return {
            totalEmployees,
            activeEmployees,
            onLeaveEmployees,
            newHires,
            terminatedEmployees,
            departmentBreakdown: departmentGroups.map((d) => ({
                department: deptMap.get(d.departmentId) ?? 'Unknown',
                count: d._count.id,
            })),
            positionBreakdown: positionGroups.map((p) => ({
                position: posMap.get(p.positionId) ?? 'Unknown',
                count: p._count.id,
            })),
        };
    }

    async exportAttendanceReport(params?: {
        startDate?: string;
        endDate?: string;
        employeeId?: string;
    }) {
        const data = await this.getAttendanceReportData(params);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Attendance Report');

        sheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 20 },
        ];

        sheet.addRow({ metric: 'Total Days', value: data.totalDays });
        sheet.addRow({ metric: 'Present Days', value: data.presentDays });
        sheet.addRow({ metric: 'Absent Days', value: data.absentDays });
        sheet.addRow({ metric: 'Late Days', value: data.lateDays });
        sheet.addRow({ metric: 'Leave Days', value: data.leaveDays });
        sheet.addRow({
            metric: 'Attendance Rate (%)',
            value: data.attendanceRate,
        });
        sheet.addRow({
            metric: 'Average Work Hours',
            value: data.averageWorkHours,
        });
        sheet.addRow({
            metric: 'Total Overtime Hours',
            value: data.totalOvertimeHours,
        });

        return workbook;
    }

    async exportEmployeeSummaryReport(params?: {
        startDate?: string;
        endDate?: string;
    }) {
        const data = await this.getEmployeeSummaryReportData(params);
        const workbook = new ExcelJS.Workbook();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        summarySheet.addRow({
            metric: 'Total Employees',
            count: data.totalEmployees,
        });
        summarySheet.addRow({
            metric: 'Active Employees',
            count: data.activeEmployees,
        });
        summarySheet.addRow({
            metric: 'On Leave Employees',
            count: data.onLeaveEmployees,
        });
        summarySheet.addRow({ metric: 'New Hires', count: data.newHires });
        summarySheet.addRow({
            metric: 'Terminated Employees',
            count: data.terminatedEmployees,
        });

        // Department breakdown sheet
        const deptSheet = workbook.addWorksheet('By Department');
        deptSheet.columns = [
            { header: 'Department', key: 'department', width: 30 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        data.departmentBreakdown.forEach((d) => deptSheet.addRow(d));

        // Position breakdown sheet
        const posSheet = workbook.addWorksheet('By Position');
        posSheet.columns = [
            { header: 'Position', key: 'position', width: 30 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        data.positionBreakdown.forEach((p) => posSheet.addRow(p));

        return workbook;
    }

    async getPayrollSummaryReportData(params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<PayrollSummaryReportData> {
        const { start, end } = this.normalizeDateRange(
            params?.startDate,
            params?.endDate,
        );

        const whereClause = {
            isDeleted: false,
            payPeriodStart: { gte: start, lte: end },
        };

        // Aggregate payroll data
        const payrollAgg = await this.prisma.client.payroll.aggregate({
            where: whereClause,
            _sum: { netSalary: true, deductions: true, bonus: true },
            _avg: { netSalary: true },
            _count: { id: true },
        });

        // Get payrolls with department info for department breakdown
        const payrolls = await this.prisma.client.payroll.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: {
                        department: { select: { id: true, departmentName: true } },
                    },
                },
            },
        });

        // Calculate department breakdown
        const deptTotals = new Map<string, { name: string; total: number }>();
        for (const p of payrolls) {
            const deptId = p.employee.department.id;
            const deptName = p.employee.department.departmentName;
            const current = deptTotals.get(deptId) ?? { name: deptName, total: 0 };
            current.total += Number(p.netSalary);
            deptTotals.set(deptId, current);
        }

        // Calculate monthly trend (last 6 months for trend)
        const trendMonths = 6;
        const payrollTrend: { period: string; amount: number }[] = [];
        const now = new Date();

        for (let i = trendMonths - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(
                now.getFullYear(),
                now.getMonth() - i + 1,
                0,
                23,
                59,
                59,
            );

            const monthAgg = await this.prisma.client.payroll.aggregate({
                where: {
                    isDeleted: false,
                    payPeriodStart: { gte: monthStart, lte: monthEnd },
                },
                _sum: { netSalary: true },
            });

            const period = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
            payrollTrend.push({
                period,
                amount: Number(monthAgg._sum?.netSalary ?? 0),
            });
        }

        return {
            totalPayroll: Number(payrollAgg._sum?.netSalary ?? 0),
            averageSalary:
                Math.round(Number(payrollAgg._avg?.netSalary ?? 0) * 100) / 100,
            totalDeductions: Number(payrollAgg._sum?.deductions ?? 0),
            totalAllowances: Number(payrollAgg._sum?.bonus ?? 0), // Using bonus as allowances
            departmentPayroll: Array.from(deptTotals.values()).map((d) => ({
                department: d.name,
                total: d.total,
            })),
            payrollTrend,
        };
    }

    async getLeaveReportData(params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<LeaveReportData> {
        const { start, end } = this.normalizeDateRange(
            params?.startDate,
            params?.endDate,
        );

        const whereClause = {
            isDeleted: false,
            requestDate: { gte: start, lte: end },
        };

        // Get status counts
        const statusCounts = await this.prisma.client.leaveRequest.groupBy({
            by: ['status'],
            where: whereClause,
            _count: { id: true },
        });

        // Get leave type breakdown
        const leaveTypeCounts = await this.prisma.client.leaveRequest.groupBy({
            by: ['leaveType'],
            where: whereClause,
            _count: { id: true },
        });

        // Calculate average leave days from approved requests
        const approvedLeaves = await this.prisma.client.leaveRequest.findMany({
            where: { ...whereClause, status: 'APPROVED' },
            select: { startDate: true, endDate: true },
        });

        let totalLeaveDays = 0;
        for (const leave of approvedLeaves) {
            const diffTime = leave.endDate.getTime() - leave.startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            totalLeaveDays += diffDays;
        }
        const averageLeaveDays =
            approvedLeaves.length > 0
                ? Math.round((totalLeaveDays / approvedLeaves.length) * 100) / 100
                : 0;

        // Monthly trend (last 6 months)
        const trendMonths = 6;
        const monthlyTrend: { month: string; count: number }[] = [];
        const now = new Date();

        for (let i = trendMonths - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(
                now.getFullYear(),
                now.getMonth() - i + 1,
                0,
                23,
                59,
                59,
            );

            const count = await this.prisma.client.leaveRequest.count({
                where: {
                    isDeleted: false,
                    requestDate: { gte: monthStart, lte: monthEnd },
                },
            });

            const month = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
            monthlyTrend.push({ month, count });
        }

        let totalRequests = 0;
        let approvedRequests = 0;
        let rejectedRequests = 0;
        let pendingRequests = 0;

        for (const stat of statusCounts) {
            totalRequests += stat._count.id;
            if (stat.status === 'APPROVED') {
                approvedRequests = stat._count.id;
            } else if (stat.status === 'REJECTED') {
                rejectedRequests = stat._count.id;
            } else if (stat.status === 'PENDING') {
                pendingRequests = stat._count.id;
            }
        }

        return {
            totalRequests,
            approvedRequests,
            rejectedRequests,
            pendingRequests,
            averageLeaveDays,
            leaveTypeBreakdown: leaveTypeCounts.map((lt) => ({
                type: lt.leaveType,
                count: lt._count.id,
            })),
            monthlyTrend,
        };
    }

    async exportPayrollSummaryReport(params?: {
        startDate?: string;
        endDate?: string;
    }) {
        const data = await this.getPayrollSummaryReportData(params);
        const workbook = new ExcelJS.Workbook();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 20 },
        ];
        summarySheet.addRow({
            metric: 'Total Payroll',
            value: data.totalPayroll,
        });
        summarySheet.addRow({
            metric: 'Average Salary',
            value: data.averageSalary,
        });
        summarySheet.addRow({
            metric: 'Total Deductions',
            value: data.totalDeductions,
        });
        summarySheet.addRow({
            metric: 'Total Allowances',
            value: data.totalAllowances,
        });

        // Department payroll sheet
        const deptSheet = workbook.addWorksheet('By Department');
        deptSheet.columns = [
            { header: 'Department', key: 'department', width: 30 },
            { header: 'Total', key: 'total', width: 20 },
        ];
        data.departmentPayroll.forEach((d) => deptSheet.addRow(d));

        // Trend sheet
        const trendSheet = workbook.addWorksheet('Payroll Trend');
        trendSheet.columns = [
            { header: 'Period', key: 'period', width: 15 },
            { header: 'Amount', key: 'amount', width: 20 },
        ];
        data.payrollTrend.forEach((t) => trendSheet.addRow(t));

        return workbook;
    }

    async exportLeaveReport(params?: {
        startDate?: string;
        endDate?: string;
    }) {
        const data = await this.getLeaveReportData(params);
        const workbook = new ExcelJS.Workbook();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 15 },
        ];
        summarySheet.addRow({
            metric: 'Total Requests',
            value: data.totalRequests,
        });
        summarySheet.addRow({
            metric: 'Approved Requests',
            value: data.approvedRequests,
        });
        summarySheet.addRow({
            metric: 'Rejected Requests',
            value: data.rejectedRequests,
        });
        summarySheet.addRow({
            metric: 'Pending Requests',
            value: data.pendingRequests,
        });
        summarySheet.addRow({
            metric: 'Average Leave Days',
            value: data.averageLeaveDays,
        });

        // Leave type breakdown sheet
        const typeSheet = workbook.addWorksheet('By Type');
        typeSheet.columns = [
            { header: 'Leave Type', key: 'type', width: 25 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        data.leaveTypeBreakdown.forEach((t) => typeSheet.addRow(t));

        // Monthly trend sheet
        const trendSheet = workbook.addWorksheet('Monthly Trend');
        trendSheet.columns = [
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        data.monthlyTrend.forEach((m) => trendSheet.addRow(m));

        return workbook;
    }
}

import {
    Controller,
    Get,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import {
    AttendanceReportData,
    EmployeeSummaryReportData,
    LeaveReportData,
    PayrollSummaryReportData,
    ReportsService,
} from './reports.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleName } from '../../common/enums/roles.enum';
import { AttendanceReportQueryDto } from './dtos/attendance-report.dto';
import { EmployeeSummaryReportQueryDto } from './dtos/employee-summary-report.dto';
import { PayrollReportQueryDto } from './dtos/payroll-report.dto';
import { LeaveReportQueryDto } from './dtos/leave-report.dto';

@Controller('reports')
@ApiTags('Reports')
@Auth(RoleName.ADMIN, RoleName.HR)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('attendance-summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get monthly attendance summary by status' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getAttendanceSummary(
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
    ) {
        return await this.reportsService.getAttendanceSummaryData(month, year);
    }

    @Get('attendance-summary/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export attendance summary (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportAttendance(
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportAttendanceSummary(
            month,
            year,
        );

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=attendance_summary.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=attendance_summary.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('leave-utilization')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get leave balances for all employees (Paginated)',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Default 1',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Default 10',
    })
    async getLeaveUtilization(
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true }))
        limit: number = 10,
    ) {
        return await this.reportsService.getPaginatedLeaveUtilization(
            page || 1,
            limit || 10,
        );
    }

    @Get('leave-utilization/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export leave utilization (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportLeaveUtilization(
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportLeaveUtilization();

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=leave_utilization.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=leave_utilization.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('attendances')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get attendance report with aggregated metrics' })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date (ISO 8601). Defaults to start of current month.',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date (ISO 8601). Defaults to end of current month.',
    })
    @ApiQuery({
        name: 'employeeId',
        required: false,
        type: String,
        description: 'Filter by specific employee',
    })
    async getAttendanceReport(
        @Query() query: AttendanceReportQueryDto,
    ): Promise<AttendanceReportData> {
        return await this.reportsService.getAttendanceReportData(query);
    }

    @Get('attendances/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export attendance report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date (ISO 8601)',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date (ISO 8601)',
    })
    @ApiQuery({
        name: 'employeeId',
        required: false,
        type: String,
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportAttendanceReport(
        @Query() query: AttendanceReportQueryDto,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportAttendanceReport(
            query,
        );

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=attendance_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=attendance_report.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('employees')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Get employee summary report with aggregated counts and breakdowns',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description:
            'Start date for newHires/terminated filter (ISO 8601). Defaults to start of current month.',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description:
            'End date for newHires/terminated filter (ISO 8601). Defaults to end of current month.',
    })
    async getEmployeeSummaryReport(
        @Query() query: EmployeeSummaryReportQueryDto,
    ): Promise<EmployeeSummaryReportData> {
        return await this.reportsService.getEmployeeSummaryReportData(query);
    }

    @Get('employees/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export employee summary report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for newHires/terminated filter',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for newHires/terminated filter',
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportEmployeeSummaryReport(
        @Query() query: EmployeeSummaryReportQueryDto,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook =
            await this.reportsService.exportEmployeeSummaryReport(query);

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=employee_summary_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=employee_summary_report.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('payrolls')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Get payroll summary report with aggregated metrics and breakdowns',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for payroll filter (ISO 8601). Defaults to start of current month.',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for payroll filter (ISO 8601). Defaults to end of current month.',
    })
    async getPayrollSummaryReport(
        @Query() query: PayrollReportQueryDto,
    ): Promise<PayrollSummaryReportData> {
        return await this.reportsService.getPayrollSummaryReportData(query);
    }

    @Get('payrolls/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export payroll summary report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date',
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportPayrollSummaryReport(
        @Query() query: PayrollReportQueryDto,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook =
            await this.reportsService.exportPayrollSummaryReport(query);

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=payroll_summary_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=payroll_summary_report.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('leaves')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Get leave report with aggregated metrics, type breakdown, and trends',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for leave filter (ISO 8601). Defaults to start of current month.',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for leave filter (ISO 8601). Defaults to end of current month.',
    })
    async getLeaveReport(
        @Query() query: LeaveReportQueryDto,
    ): Promise<LeaveReportData> {
        return await this.reportsService.getLeaveReportData(query);
    }

    @Get('leaves/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export leave report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date',
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportLeaveReport(
        @Query() query: LeaveReportQueryDto,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportLeaveReport(query);

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=leave_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=leave_report.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('comprehensive')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Get comprehensive report (employees, payroll, attendance, leaves)',
    })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'month', required: false, type: Number })
    async getComprehensiveReport(
        @Query('year', new ParseIntPipe({ optional: true })) year?: number,
        @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    ) {
        return await this.reportsService.getComprehensiveReportData({
            year,
            month,
        });
    }
}

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
import { EmployeeReportData, PayrollReportData, ReportsService } from './reports.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleName } from '../../common/enums/roles.enum';

@Controller('reports')
@ApiTags('Reports')
@Auth(RoleName.ADMIN, RoleName.HR)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

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

    @Get('employee')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get employee report with filters' })
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'],
    })
    async getEmployeeReport(
        @Query('departmentId') departmentId?: string,
        @Query('status') status?: string,
    ): Promise<EmployeeReportData[]> {
        return await this.reportsService.getEmployeeReportData({
            departmentId,
            status,
        });
    }

    @Get('employee/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export employee report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'],
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportEmployeeReport(
        @Query('departmentId') departmentId: string | undefined,
        @Query('status') status: string | undefined,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportEmployeeReport({
            departmentId,
            status,
        });

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=employee_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=employee_report.xlsx',
            );
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('payroll')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get payroll report with filters' })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['PENDING', 'PROCESSED', 'PAID', 'CANCELLED'],
    })
    async getPayrollReport(
        @Query('year', new ParseIntPipe({ optional: true })) year?: number,
        @Query('month', new ParseIntPipe({ optional: true })) month?: number,
        @Query('departmentId') departmentId?: string,
        @Query('status') status?: string,
    ): Promise<PayrollReportData[]> {
        return await this.reportsService.getPayrollReportData({
            year,
            month,
            departmentId,
            status,
        });
    }

    @Get('payroll/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export payroll report (xlsx/csv)' })
    @ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    )
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['PENDING', 'PROCESSED', 'PAID', 'CANCELLED'],
    })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportPayrollReport(
        @Query('year', new ParseIntPipe({ optional: true }))
        year: number | undefined,
        @Query('month', new ParseIntPipe({ optional: true }))
        month: number | undefined,
        @Query('departmentId') departmentId: string | undefined,
        @Query('status') status: string | undefined,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportPayrollReport({
            year,
            month,
            departmentId,
            status,
        });

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header(
                'Content-Disposition',
                'attachment; filename=payroll_report.csv',
            );
            await workbook.csv.write(res);
        } else {
            res.header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.header(
                'Content-Disposition',
                'attachment; filename=payroll_report.xlsx',
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

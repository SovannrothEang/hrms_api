import { Controller, Get, Query, HttpCode, HttpStatus, ParseIntPipe, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleName } from '../../common/enums/roles.enum';

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
    @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv')
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportAttendance(
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportAttendanceSummary(month, year);

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename=attendance_summary.csv');
            await workbook.csv.write(res);
        } else {
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.header('Content-Disposition', 'attachment; filename=attendance_summary.xlsx');
            await workbook.xlsx.write(res);
        }
        res.end();
    }

    @Get('leave-utilization')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get leave balances for all employees' })
    async getLeaveUtilization() {
        return await this.reportsService.getLeaveUtilizationData();
    }

    @Get('leave-utilization/export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Export leave utilization (xlsx/csv)' })
    @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv')
    @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: true })
    async exportLeaveUtilization(
        @Query('format') format: 'xlsx' | 'csv',
        @Res() res: Response,
    ) {
        const workbook = await this.reportsService.exportLeaveUtilization();

        if (format === 'csv') {
            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename=leave_utilization.csv');
            await workbook.csv.write(res);
        } else {
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.header('Content-Disposition', 'attachment; filename=leave_utilization.xlsx');
            await workbook.xlsx.write(res);
        }
        res.end();
    }
}

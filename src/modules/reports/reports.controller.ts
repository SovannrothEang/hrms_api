import { Controller, Get, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleName } from '../../common/enums/roles.enum';

@Controller('reports')
@ApiTags('Reports')
@Auth(RoleName.ADMIN, RoleName.HR)
export class ReportsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('attendance-summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get monthly attendance summary by status' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getAttendanceSummary(
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
    ) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const summary = await this.prisma.attendance.groupBy({
            by: ['status'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _count: {
                id: true,
            },
        });

        // Format for easier consumption
        return summary.map(item => ({
            status: item.status,
            count: item._count.id
        }));
    }

    @Get('leave-utilization')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get leave balances for all employees' })
    async getLeaveUtilization() {
        // Aggregate balances
        const balances = await this.prisma.leaveBalance.findMany({
            include: {
                employee: {
                    select: {
                        firstname: true,
                        lastname: true,
                        employeeCode: true,
                        department: {
                            select: { departmentName: true }
                        }
                    }
                }
            }
        });

        return balances.map(b => ({
            employee: `${b.employee.firstname} ${b.employee.lastname}`,
            code: b.employee.employeeCode,
            department: b.employee.department.departmentName,
            type: b.leaveType,
            year: b.year,
            total: b.totalDays,
            used: b.usedDays,
            pending: b.pendingDays,
            remaining: Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays)
        }));
    }
}

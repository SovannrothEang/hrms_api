import {
    Controller,
    Get,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Auth } from 'src/common/decorators/auth.decorator';
import { DashboardStatsDto } from './dtos/dashboard-stats.dto';
import { AttendanceTrendDto } from './dtos/attendance-trend.dto';
import { DepartmentDistributionDto } from './dtos/department-distribution.dto';
import { RecentActivitiesDto } from './dtos/recent-activity.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';

@Controller('dashboard')
@ApiTags('Dashboard')
@Auth()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('stats')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get dashboard statistics' })
    @ApiResponse({ status: HttpStatus.OK, type: DashboardStatsDto })
    async getStats(): Promise<DashboardStatsDto> {
        return await this.dashboardService.getStatsAsync();
    }

    @Get('attendance-trend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get attendance trend for last N days' })
    @ApiQuery({
        name: 'days',
        required: false,
        type: Number,
        description: 'Number of days (default: 7)',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AttendanceTrendDto })
    async getAttendanceTrend(
        @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
    ): Promise<AttendanceTrendDto> {
        return await this.dashboardService.getAttendanceTrendAsync(days || 7);
    }

    @Get('department-distribution')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get employee distribution by department' })
    @ApiResponse({ status: HttpStatus.OK, type: DepartmentDistributionDto })
    async getDepartmentDistribution(): Promise<DepartmentDistributionDto> {
        return await this.dashboardService.getDepartmentDistributionAsync();
    }

    @Get('recent-activity')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get recent system activity (Paginated)' })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of activities per page (default: 10)',
    })
    @ApiResponse({ status: HttpStatus.OK, description: 'Paginated recent activities' })
    async getRecentActivity(
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true }))
        limit: number = 10,
    ): Promise<ResultPagination<any>> {
        return await this.dashboardService.getPaginatedRecentActivityAsync(
            page || 1,
            limit || 10,
        );
    }
}

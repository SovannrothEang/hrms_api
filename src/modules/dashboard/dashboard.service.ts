import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import { DashboardStatsDto } from './dtos/dashboard-stats.dto';
import {
    AttendanceTrendDto,
    AttendanceTrendItemDto,
} from './dtos/attendance-trend.dto';
import { DepartmentDistributionDto } from './dtos/department-distribution.dto';
import { RecentActivitiesDto } from './dtos/recent-activity.dto';

import { ResultPagination } from 'src/common/logic/result-pagination';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getStatsAsync(): Promise<DashboardStatsDto> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        try {
            const [
                totalEmployees,
                totalDepartments,
                todayAttendance,
                pendingLeaveRequests,
                approvedLeavesToday,
                newEmployeesThisMonth,
            ] = await Promise.all([
                this.prisma.client.employee.count({
                    where: { isDeleted: false, isActive: true },
                }),
                this.prisma.client.department.count({
                    where: { isDeleted: false, isActive: true },
                }),
                this.prisma.client.attendance.groupBy({
                    by: ['status'],
                    where: {
                        date: { gte: today, lt: tomorrow },
                        isDeleted: false,
                        isActive: true,
                    },
                    _count: { id: true },
                }),
                this.prisma.client.leaveRequest.count({
                    where: {
                        status: 'PENDING',
                        isDeleted: false,
                        isActive: true,
                    },
                }),
                this.prisma.client.leaveRequest.count({
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: today },
                        endDate: { gte: today },
                        isDeleted: false,
                        isActive: true,
                    },
                }),
                this.prisma.client.employee.count({
                    where: {
                        createdAt: { gte: startOfMonth },
                        isDeleted: false,
                        isActive: true,
                    },
                }),
            ]);

            const attendanceMap = new Map(
                todayAttendance.map((a) => [a.status, a._count.id]),
            );

            const presentToday = attendanceMap.get('PRESENT') || 0;
            const lateToday = attendanceMap.get('LATE') || 0;
            const absentToday =
                totalEmployees - presentToday - lateToday - approvedLeavesToday;

            return {
                totalEmployees,
                presentToday,
                onLeave: approvedLeavesToday,
                pendingLeaveRequests,
                absentToday: Math.max(0, absentToday),
                lateToday,
                totalDepartments,
                newEmployeesThisMonth,
            };
        } catch (error) {
            this.logger.error('Failed to fetch dashboard stats', error);
            throw error;
        }
    }

    async getAttendanceTrendAsync(
        days: number = 7,
    ): Promise<AttendanceTrendDto> {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        try {
            const attendances = await this.prisma.client.attendance.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    isDeleted: false,
                    isActive: true,
                },
                select: {
                    date: true,
                    status: true,
                },
            });

            const leaveRequests =
                await this.prisma.client.leaveRequest.findMany({
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                        isDeleted: false,
                        isActive: true,
                    },
                    select: {
                        startDate: true,
                        endDate: true,
                    },
                });

            const trend: AttendanceTrendItemDto[] = [];

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];

                const dayAttendances = attendances.filter((a) => {
                    const aDate = new Date(a.date).toISOString().split('T')[0];
                    return aDate === dateStr;
                });

                const onLeave = leaveRequests.filter((lr) => {
                    return lr.startDate <= date && lr.endDate >= date;
                }).length;

                const present = dayAttendances.filter(
                    (a) => a.status === 'PRESENT',
                ).length;
                const late = dayAttendances.filter(
                    (a) => a.status === 'LATE',
                ).length;
                const absent = dayAttendances.filter(
                    (a) => a.status === 'ABSENT',
                ).length;

                trend.push({
                    date: dateStr,
                    present,
                    absent,
                    late,
                    onLeave,
                });
            }

            return { trend, days };
        } catch (error) {
            this.logger.error('Failed to fetch attendance trend', error);
            throw error;
        }
    }

    async getDepartmentDistributionAsync(): Promise<DepartmentDistributionDto> {
        try {
            const departments = await this.prisma.client.department.findMany({
                where: { isDeleted: false, isActive: true },
                select: {
                    id: true,
                    departmentName: true,
                    _count: {
                        select: {
                            employees: {
                                where: { isDeleted: false, isActive: true },
                            },
                        },
                    },
                },
                orderBy: {
                    departmentName: 'asc',
                },
            });

            const totalEmployees = departments.reduce(
                (sum, d) => sum + d._count.employees,
                0,
            );

            return {
                departments: departments.map((d) => ({
                    id: d.id,
                    name: d.departmentName,
                    employeeCount: d._count.employees,
                    percentage:
                        totalEmployees > 0
                            ? Math.round(
                                (d._count.employees / totalEmployees) * 10000,
                            ) / 100
                            : 0,
                })),
                totalEmployees,
            };
        } catch (error) {
            this.logger.error('Failed to fetch department distribution', error);
            throw error;
        }
    }

    async getRecentActivityAsync(
        limit: number = 10,
    ): Promise<RecentActivitiesDto> {
        try {
            const logs = await this.prisma.client.auditLog.findMany({
                where: { isDeleted: false, isActive: true },
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            employee: {
                                select: {
                                    firstname: true,
                                    lastname: true,
                                },
                            },
                        },
                    },
                },
            });

            const activities = logs.map((log) => {
                const userName = log.user?.employee
                    ? `${log.user.employee.firstname} ${log.user.employee.lastname}`
                    : log.user?.username || log.user?.email;

                return {
                    id: log.id,
                    action: log.action,
                    entityType: log.tableName,
                    entityId: log.recordId,
                    performedBy: userName,
                    userId: log.userId ?? undefined,
                    timestamp: log.timestamp,
                    description: this.generateActivityDescription(
                        log.action,
                        log.tableName,
                    ),
                };
            });

            return { activities, count: activities.length };
        } catch (error) {
            this.logger.error('Failed to fetch recent activity', error);
            throw error;
        }
    }

    async getPaginatedRecentActivityAsync(
        page: number,
        limit: number,
    ): Promise<ResultPagination<any>> {
        try {
            const skip = (page - 1) * limit;
            const where = { isDeleted: false, isActive: true };

            const [total, logs] = await Promise.all([
                this.prisma.client.auditLog.count({ where }),
                this.prisma.client.auditLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                username: true,
                                employee: {
                                    select: {
                                        firstname: true,
                                        lastname: true,
                                    },
                                },
                            },
                        },
                    },
                }),
            ]);

            const activities = logs.map((log) => {
                const userName = log.user?.employee
                    ? `${log.user.employee.firstname} ${log.user.employee.lastname}`
                    : log.user?.username || log.user?.email;

                return {
                    id: log.id,
                    action: log.action,
                    entityType: log.tableName,
                    entityId: log.recordId,
                    performedBy: userName,
                    userId: log.userId ?? undefined,
                    timestamp: log.timestamp,
                    description: this.generateActivityDescription(
                        log.action,
                        log.tableName,
                    ),
                };
            });

            return ResultPagination.of(activities, total, page, limit);
        } catch (error) {
            this.logger.error(
                'Failed to fetch paginated recent activity',
                error,
            );
            throw error;
        }
    }

    private generateActivityDescription(
        action: string,
        tableName: string,
    ): string {
        const entityName = tableName.replace(/_/g, ' ').toLowerCase();
        switch (action.toUpperCase()) {
            case 'CREATE':
                return `Created new ${entityName} record`;
            case 'UPDATE':
                return `Updated ${entityName} record`;
            case 'DELETE':
                return `Deleted ${entityName} record`;
            default:
                return `${action} on ${entityName}`;
        }
    }
}

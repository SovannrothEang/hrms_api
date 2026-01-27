import { Injectable, Logger } from '@nestjs/common';
import { AuditSeverity, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { AuditLogQueryDto } from './dtos/audit-log-query.dto';
import { AuditLogDto } from './dtos/audit-log.dto';

@Injectable()
export class AuditLogsService {
    private readonly logger = new Logger(AuditLogsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAllPaginatedAsync(
        query: AuditLogQueryDto,
    ): Promise<ResultPagination<AuditLogDto>> {
        const {
            page = 1,
            limit = 10,
            userId,
            action,
            tableName,
            recordId,
            startDate,
            endDate,
            severity,
            success,
        } = query;

        const where: Prisma.AuditLogWhereInput = {
            isDeleted: false,
            isActive: true,
        };

        if (userId) {
            where.userId = userId;
        }

        if (action) {
            where.action = { contains: action, mode: 'insensitive' };
        }

        if (tableName) {
            where.tableName = { contains: tableName, mode: 'insensitive' };
        }

        if (recordId) {
            where.recordId = recordId;
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.timestamp.lte = end;
            }
        }

        if (severity) {
            where.severity = severity as AuditSeverity;
        }

        if (success !== undefined) {
            where.success = success;
        }

        try {
            const [total, logs] = await Promise.all([
                this.prisma.client.auditLog.count({ where }),
                this.prisma.client.auditLog.findMany({
                    where,
                    skip: query.skip,
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

            const data: AuditLogDto[] = logs.map((log) => ({
                id: log.id,
                userId: log.userId ?? undefined,
                action: log.action,
                tableName: log.tableName,
                recordId: log.recordId,
                oldValue: log.oldValue as Record<string, unknown> | undefined,
                newValue: log.newValue as Record<string, unknown> | undefined,
                timestamp: log.timestamp,
                ipAddress: log.ipAddress ?? undefined,
                userAgent: log.userAgent ?? undefined,
                severity: log.severity,
                success: log.success,
                user: log.user
                    ? {
                          id: log.user.id,
                          email: log.user.email,
                          firstname: log.user.employee?.firstname,
                          lastname: log.user.employee?.lastname,
                      }
                    : undefined,
            }));

            return ResultPagination.of(data, total, page, limit);
        } catch (error) {
            this.logger.error('Failed to fetch audit logs', error);
            throw error;
        }
    }

    async findByIdAsync(id: string): Promise<AuditLogDto | null> {
        try {
            const log = await this.prisma.client.auditLog.findFirst({
                where: { id, isDeleted: false, isActive: true },
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

            if (!log) {
                return null;
            }

            return {
                id: log.id,
                userId: log.userId ?? undefined,
                action: log.action,
                tableName: log.tableName,
                recordId: log.recordId,
                oldValue: log.oldValue as Record<string, unknown> | undefined,
                newValue: log.newValue as Record<string, unknown> | undefined,
                timestamp: log.timestamp,
                ipAddress: log.ipAddress ?? undefined,
                userAgent: log.userAgent ?? undefined,
                severity: log.severity,
                success: log.success,
                user: log.user
                    ? {
                          id: log.user.id,
                          email: log.user.email,
                          firstname: log.user.employee?.firstname,
                          lastname: log.user.employee?.lastname,
                      }
                    : undefined,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch audit log ${id}`, error);
            throw error;
        }
    }

    async getDistinctActionsAsync(): Promise<string[]> {
        const results = await this.prisma.client.auditLog.findMany({
            where: { isDeleted: false, isActive: true },
            select: { action: true },
            distinct: ['action'],
            orderBy: { action: 'asc' },
        });
        return results.map((r) => r.action);
    }

    async getDistinctTablesAsync(): Promise<string[]> {
        const results = await this.prisma.client.auditLog.findMany({
            where: { isDeleted: false, isActive: true },
            select: { tableName: true },
            distinct: ['tableName'],
            orderBy: { tableName: 'asc' },
        });
        return results.map((r) => r.tableName);
    }

    getDistinctSeveritiesAsync(): string[] {
        return ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    }
}

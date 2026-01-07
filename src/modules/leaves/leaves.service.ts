import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Result } from 'src/common/logic/result';
import { LeaveRequestDto } from './dtos/leave-request.dto';
import { LeaveRequestCreateDto } from './dtos/leave-request-create.dto';
import { LeaveRequestStatusUpdateDto } from './dtos/leave-request-status-update.dto';
import { plainToInstance } from 'class-transformer';
import { LeaveStatus } from 'src/common/enums/leave-status.enum';

@Injectable()
export class LeavesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAllAsync(childIncluded?: boolean): Promise<Result<LeaveRequestDto[]>> {
        const leaves = await this.prisma.leaveRequest.findMany({
            include: {
                requester: childIncluded ? { include: { department: true } } : false,
                approver: childIncluded ? true : false,
                performer: childIncluded
                    ? {
                        include: {
                            userRoles: {
                                include: { role: true },
                            },
                        },
                    }
                    : false,
            },
        });
        return Result.ok(leaves.map((l) => plainToInstance(LeaveRequestDto, l)));
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<LeaveRequestDto>> {
        const leave = await this.prisma.leaveRequest.findFirst({
            where: { id },
            include: {
                requester: childIncluded ? { include: { department: true } } : false,
                approver: childIncluded ? true : false,
                performer: childIncluded
                    ? {
                        include: {
                            userRoles: {
                                include: { role: true },
                            },
                        },
                    }
                    : false,
            },
        });
        if (!leave) return Result.fail('Leave request not found');
        return Result.ok(plainToInstance(LeaveRequestDto, leave));
    }

    async createAsync(
        dto: LeaveRequestCreateDto,
        performerId?: string,
    ): Promise<Result<LeaveRequestDto>> {
        // Check overlap
        const overlaps = await this.prisma.leaveRequest.findFirst({
            where: {
                employeeId: dto.employeeId,
                status: { not: LeaveStatus.REJECTED },
                OR: [
                    {
                        startDate: { lte: dto.endDate },
                        endDate: { gte: dto.startDate },
                    },
                ],
            },
        });

        if (overlaps) {
            return Result.fail('Leave request overlaps with an existing request.');
        }

        const leave = await this.prisma.leaveRequest.create({
            data: {
                ...dto,
                status: LeaveStatus.PENDING,
                performBy: performerId,
            },
            include: { requester: true },
        });

        return Result.ok(plainToInstance(LeaveRequestDto, leave));
    }

    async updateStatusAsync(
        id: string,
        dto: LeaveRequestStatusUpdateDto,
        performerId?: string,
    ): Promise<Result<LeaveRequestDto>> {
        const leave = await this.prisma.leaveRequest.findUnique({
            where: { id },
        });

        if (!leave) return Result.fail('Leave request not found');

        const updatedLeave = await this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: dto.status,
                approvedBy: dto.approverId,
                performBy: performerId,
            },
            include: { requester: true, approver: true },
        });

        return Result.ok(plainToInstance(LeaveRequestDto, updatedLeave));
    }

    async deleteAsync(id: string): Promise<Result<void>> {
        const leave = await this.prisma.leaveRequest.findUnique({
            where: { id },
        });

        if (!leave) return Result.fail('Leave request not found');
        if (leave.status !== LeaveStatus.PENDING) return Result.fail('Cannot delete processed leave request');

        await this.prisma.leaveRequest.delete({ where: { id } });
        return Result.ok();
    }
}

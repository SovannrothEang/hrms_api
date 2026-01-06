import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeePositionCreateDto } from './dtos/employee-position-create.dto';
import { EmployeePositionDto } from './dtos/employee-position.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import { EmployeePositionUpdateDto } from './dtos/employee-position-update.dto';

@Injectable()
export class EmployeePositionsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAllAsync(
        childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto[]>> {
        const positions = await this.prisma.employeePosition.findMany({
            include: {
                employees: childIncluded ? true : false,
                performer: childIncluded
                    ? {
                        include: { userRoles: { include: { role: true } } },
                    }
                    : false,
            },
        });
        return Result.ok(
            positions.map((p) => plainToInstance(EmployeePositionDto, p)),
        );
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto>> {
        const position = await this.prisma.employeePosition.findFirst({
            where: { id },
            include: {
                employees: childIncluded ? true : false,
                performer: childIncluded
                    ? {
                        include: { userRoles: { include: { role: true } } },
                    }
                    : false,
            },
        });
        if (!position) {
            return Result.notFound(`No position was found with id: ${id}`);
        }
        return Result.ok(plainToInstance(EmployeePositionDto, position));
    }

    async createEmployeePosition(
        dto: EmployeePositionCreateDto,
        performBy: string | null,
    ): Promise<Result<EmployeePositionDto>> {
        const isExist = await this.prisma.employeePosition.findFirst({
            where: { title: dto.title },
            select: { id: true },
        });
        if (isExist) {
            return Result.fail(
                `Position with title: ${dto.title} already exists.`,
            );
        }

        const position = await this.prisma.employeePosition.create({
            data: {
                ...dto,
                performer: performBy
                    ? { connect: { id: performBy } }
                    : undefined,
            },
        });
        return Result.ok(plainToInstance(EmployeePositionDto, position));
    }

    async updateEmployeePosition(
        id: string,
        dto: EmployeePositionUpdateDto,
        performBy: string | null,
    ): Promise<void> {
        const isExist = await this.prisma.employeePosition.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!isExist)
            throw new NotFoundException(`No position was found with id: ${id}`);

        if (dto.title) {
            const isTitleExist = await this.prisma.employeePosition.findFirst({
                where: { title: dto.title, id: { not: id } },
                select: { id: true },
            });
            if (isTitleExist)
                throw new BadRequestException(
                    `Position with title: ${dto.title} already exists.`,
                );
        }

        await this.prisma.employeePosition.update({
            where: { id },
            data: {
                ...dto,
                performer: performBy
                    ? { connect: { id: performBy } }
                    : undefined,
            },
        });
    }

    async deleteEmployeePositionAsync(
        id: string,
        performBy: string,
    ): Promise<void> {
        const isExist = await this.prisma.employeePosition.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!isExist)
            throw new NotFoundException(`No position was found with id: ${id}`);

        await this.prisma.employeePosition.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performer: { connect: { id: performBy } },
            },
        });
    }
}

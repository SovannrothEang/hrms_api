import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { EmployeePositionCreateDto } from './dtos/employee-position-create.dto';
import { EmployeePositionDto } from './dtos/employee-position.dto';
import { plainToInstance } from 'class-transformer';
import { Result } from 'src/common/logic/result';
import { EmployeePositionUpdateDto } from './dtos/employee-position-update.dto';

import { ResultPagination } from 'src/common/logic/result-pagination';

@Injectable()
export class EmployeePositionsService {
    private readonly _logger = new Logger(EmployeePositionsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAllAsync(
        childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto[]>> {
        this._logger.log('Get all positions');
        const positions = await this.prisma.client.employeePosition.findMany({
            include: {
                employees: childIncluded ? true : false,
                performer: childIncluded
                    ? {
                          include: { userRoles: { include: { role: true } } },
                      }
                    : false,
            },
            orderBy: { title: 'asc' },
        });
        this._logger.log(`Positions: ${JSON.stringify(positions)}`);

        return Result.ok(
            positions.map((p) => plainToInstance(EmployeePositionDto, p)),
        );
    }

    async findAllPaginatedAsync(
        page: number,
        limit: number,
        childIncluded?: boolean,
    ): Promise<ResultPagination<EmployeePositionDto>> {
        this._logger.log(
            `Get paginated positions: page ${page}, limit ${limit}`,
        );
        const skip = (page - 1) * limit;

        const [total, positions] = await Promise.all([
            this.prisma.client.employeePosition.count({
                where: { isDeleted: false },
            }),
            this.prisma.client.employeePosition.findMany({
                where: { isDeleted: false },
                skip,
                take: limit,
                include: {
                    employees: childIncluded ? true : false,
                    performer: childIncluded
                        ? {
                              include: {
                                  userRoles: { include: { role: true } },
                              },
                          }
                        : false,
                },
                orderBy: { title: 'asc' },
            }),
        ]);

        const dtos = positions.map((p) =>
            plainToInstance(EmployeePositionDto, p),
        );
        return ResultPagination.of(dtos, total, page, limit);
    }

    async findOneByIdAsync(
        id: string,
        childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto>> {
        const position = await this.prisma.client.employeePosition.findFirst({
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
        const isExist = await this.prisma.client.employeePosition.findFirst({
            where: { title: dto.title },
            select: { id: true },
        });
        if (isExist) {
            return Result.fail(
                `Position with title: ${dto.title} already exists.`,
            );
        }

        const position = await this.prisma.client.employeePosition.create({
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
        const isExist = await this.prisma.client.employeePosition.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!isExist)
            throw new NotFoundException(`No position was found with id: ${id}`);

        if (dto.title) {
            const isTitleExist =
                await this.prisma.client.employeePosition.findFirst({
                    where: { title: dto.title, id: { not: id } },
                    select: { id: true },
                });
            if (isTitleExist)
                throw new BadRequestException(
                    `Position with title: ${dto.title} already exists.`,
                );
        }

        await this.prisma.client.employeePosition.update({
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
        const isExist = await this.prisma.client.employeePosition.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!isExist)
            throw new NotFoundException(`No position was found with id: ${id}`);

        await this.prisma.client.employeePosition.update({
            where: { id, isDeleted: false },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                performer: { connect: { id: performBy } },
            },
        });
    }
}

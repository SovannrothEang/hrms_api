import { Controller, Get, Query, Param, Body, Post, NotFoundException, Delete, Put, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { EmployeePositionsService } from './employee-positions.service';
import { Result } from 'src/common/logic/result';
import { EmployeePositionDto } from './dtos/employee-position.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { EmployeePositionCreateDto } from './dtos/employee-position-create.dto';
import { EmployeePositionUpdateDto } from './dtos/employee-position-update.dto';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RoleName } from 'src/common/enums/roles.enum';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ApiTags } from '@nestjs/swagger';

@Controller('employees/positions')
@ApiTags('Employee Positions')
@Auth(RoleName.ADMIN)
export class EmployeePositionsController {
    constructor(private readonly employeePositionsService: EmployeePositionsService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all employee positions' })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK })
    async findAllAsync(
        @Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto[]>> {
        return await this.employeePositionsService.findAllAsync(childIncluded);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get employee position by id' })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOneByIdAsync(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean,
    ): Promise<Result<EmployeePositionDto>> {
        const result = await this.employeePositionsService.findOneByIdAsync(id, childIncluded);
        if (!result.isSuccess)
            throw new NotFoundException(result.error);
        return result;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create employee position' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async createEmployeePosition(
        @Body() dto: EmployeePositionCreateDto,
        @CurrentUser('sub') userId: string
    ): Promise<Result<EmployeePositionDto>> {
        return await this.employeePositionsService.createEmployeePosition(dto, userId);
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update employee position' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async updateEmployeePosition(
        @Param('id') id: string,
        @Body() dto: EmployeePositionUpdateDto,
        @CurrentUser('sub') userId: string
    ): Promise<void> {
        await this.employeePositionsService.updateEmployeePosition(id, dto, userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete employee position' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async deleteEmployeePositionAsync(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string
    ): Promise<void> {
        await this.employeePositionsService.deleteEmployeePositionAsync(id, userId);
    }
}

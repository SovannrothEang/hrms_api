import {
    Controller,
    Get,
    Query,
    Param,
    Body,
    Post,
    NotFoundException,
    Delete,
    Put,
    HttpCode,
    HttpStatus,
    ParseBoolPipe,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { EmployeePositionsService } from './employee-positions.service';

import { EmployeePositionDto } from './dtos/employee-position.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { EmployeePositionCreateDto } from './dtos/employee-position-create.dto';
import { EmployeePositionUpdateDto } from './dtos/employee-position-update.dto';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { RoleName } from 'src/common/enums/roles.enum';
import { Auth } from 'src/common/decorators/auth.decorator';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';

@Controller('employees/positions')
@ApiTags('Employee Positions')
@Auth(RoleName.ADMIN)
export class EmployeePositionsController {
    private readonly _logger = new Logger(EmployeePositionsController.name);

    constructor(
        private readonly employeePositionsService: EmployeePositionsService,
    ) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all employee positions (Paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of positions' })
    async findAllAsync(
        @Query() pagination: PaginationDto,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ): Promise<ResultPagination<EmployeePositionDto>> {
        this._logger.log(`Get paginated positions`);
        return await this.employeePositionsService.findAllPaginatedAsync(
            pagination.page || 1,
            pagination.limit || 10,
            childIncluded,
        );
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get employee position by id' })
    @ApiParam({ name: 'id', required: true, description: 'Position ID' })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOneByIdAsync(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ): Promise<EmployeePositionDto> {
        const result = await this.employeePositionsService.findOneByIdAsync(
            id,
            childIncluded,
        );
        if (!result.isSuccess) throw new NotFoundException(result.error);
        return result.getData();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create employee position' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async createEmployeePosition(
        @Body() dto: EmployeePositionCreateDto,
        @CurrentUser('sub') userId: string,
    ): Promise<EmployeePositionDto> {
        const result =
            await this.employeePositionsService.createEmployeePosition(
                dto,
                userId,
            );
        if (!result.isSuccess) throw new BadRequestException(result.error);
        return result.getData();
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update employee position' })
    @ApiParam({ name: 'id', required: true, description: 'Position ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async updateEmployeePosition(
        @Param('id') id: string,
        @Body() dto: EmployeePositionUpdateDto,
        @CurrentUser('sub') userId: string,
    ): Promise<void> {
        await this.employeePositionsService.updateEmployeePosition(
            id,
            dto,
            userId,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete employee position' })
    @ApiParam({ name: 'id', required: true, description: 'Position ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async deleteEmployeePositionAsync(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
    ): Promise<void> {
        await this.employeePositionsService.deleteEmployeePositionAsync(
            id,
            userId,
        );
    }
}

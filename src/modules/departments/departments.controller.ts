import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    ParseBoolPipe,
    Param,
    Post,
    Body,
    BadRequestException,
    NotFoundException,
    Put,
    Delete,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentCreateDto } from './dtos/department-create.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DepartmentUpdateDto } from './dtos/department-update.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { DepartmentQueryDto } from './dtos/department-query.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { DepartmentDto } from './dtos/department.dto';

@Controller('departments')
@Auth(RoleName.ADMIN)
@ApiTags('Departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all departments (Filtered)' })
    @ApiQuery({ name: 'name', required: false, type: String })
    @ApiQuery({ name: 'employeeCountRange', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'sortBy', required: false, type: String })
    @ApiQuery({ name: 'sortOrder', required: false, type: String })
    @ApiQuery({ name: 'includeEmployees', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK })
    async findAllAsync(
        @Query() query: DepartmentQueryDto,
    ): Promise<DepartmentDto[]> {
        const result =
            await this.departmentsService.findAllFilteredAsync(query);
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get department by id' })
    @ApiParam({ name: 'id', required: true })
    @ApiQuery({ name: 'childIncluded', required: false })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOneByIdAsync(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        const result = await this.departmentsService.findOneByIdAsync(
            id,
            childIncluded,
        );
        if (!result.isSuccess) {
            throw new NotFoundException(result.error);
        }
        return result.getData();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new department' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Created' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async createAsync(
        @CurrentUser('sub') userId: string,
        @Body() dto: DepartmentCreateDto,
    ) {
        const result = await this.departmentsService.createAsync(dto, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update a department by id' })
    @ApiParam({ name: 'id', required: true })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async updateAsync(
        @Param('id') id: string,
        @Body() dto: DepartmentUpdateDto,
        @CurrentUser('sub') userId: string,
    ) {
        await this.departmentsService.updateAsync(id, dto, userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a department by id' })
    @ApiParam({ name: 'id', required: true })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async deleteAsync(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
    ) {
        await this.departmentsService.deleteAsync(id, userId);
    }
}

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
    Put,
    Delete,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentCreateDto } from './dtos/department-create.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DepartmentUpdateDto } from './dtos/department-update.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('departments')
@Auth(RoleName.ADMIN)
@ApiTags('Departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all departments' })
    @ApiParam({ name: 'childIncluded', required: false })
    @ApiParam({ name: 'employeeIncluded', required: false })
    @ApiResponse({ status: HttpStatus.OK })
    async findAllAsync(
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
        @Query('employeeIncluded', new ParseBoolPipe({ optional: true }))
        employeeIncluded?: boolean,
    ) {
        if (!employeeIncluded)
            return this.departmentsService.findAllAsync(childIncluded);
        else
            return this.departmentsService.findAllWithEmployeeAsync(
                childIncluded,
            );
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get department by id' })
    @ApiParam({ name: 'childIncluded', required: false })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOneByIdAsync(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        return this.departmentsService.findOneByIdAsync(id, childIncluded);
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
        const department = await this.departmentsService.createAsync(
            dto,
            userId,
        );
        if (!department.isSuccess) {
            throw new BadRequestException(department.error);
        }
        return department;
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update a department by id' })
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
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async deleteAsync(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
    ) {
        await this.departmentsService.deleteAsync(id, userId);
    }
}

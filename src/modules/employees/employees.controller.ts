import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseBoolPipe,
    Patch,
    Post,
    Query,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { EmployeeCreateDto } from './dtos/employee-create.dto';
import { EmployeeUpdateDto } from './dtos/employee-update.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleName } from '../../common/enums/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmployeeQueryDto } from './dtos/employee-query.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { EmployeeDto } from './dtos/employee.dto';

@Controller('employees')
@ApiTags('Employees')
@Auth()
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all employees (Filtered)' })
    @ApiQuery({ name: 'employeeCode', required: false, type: String })
    @ApiQuery({ name: 'firstname', required: false, type: String })
    @ApiQuery({ name: 'lastname', required: false, type: String })
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({ name: 'positionId', required: false, type: String })
    @ApiQuery({ name: 'employmentType', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'hireDateFrom', required: false, type: String })
    @ApiQuery({ name: 'hireDateTo', required: false, type: String })
    @ApiQuery({ name: 'salaryRange', required: false, type: String })
    @ApiQuery({ name: 'gender', required: false, type: String })
    @ApiQuery({ name: 'sortBy', required: false, type: String })
    @ApiQuery({ name: 'sortOrder', required: false, type: String })
    @ApiQuery({ name: 'includeDetails', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll(
        @Query() query: EmployeeQueryDto,
    ): Promise<ResultPagination<EmployeeDto>> {
        const result = await this.employeesService.findAllFilteredAsync(query);
        if (!result.isSuccess) throw new BadRequestException(result.error);
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', required: true, description: 'Employee ID' })
    @ApiQuery({ name: 'childIncluded', required: false })
    @ApiOperation({ summary: 'Get employee by ID' })
    @ApiResponse({ status: HttpStatus.OK })
    async findOne(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        const result = await this.employeesService.findOneByIdAsync(
            id,
            childIncluded,
        );
        if (!result.isSuccess) throw new NotFoundException(result.error);
        return result.getData();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Auth(RoleName.ADMIN, RoleName.HR)
    @ApiOperation({ summary: 'Create new employee (Admin/HR only)' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async create(
        @Body() dto: EmployeeCreateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.employeesService.createAsync(
            dto,
            performerId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @Auth(RoleName.ADMIN, RoleName.HR)
    @ApiParam({ name: 'id', required: true, description: 'Employee ID' })
    @ApiOperation({ summary: 'Update employee details' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async update(
        @Param('id') id: string,
        @Body() dto: EmployeeUpdateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.employeesService.updateAsync(
            id,
            dto,
            performerId,
        );
        if (!result.isSuccess) {
            throw new NotFoundException(result.error);
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Auth(RoleName.ADMIN)
    @ApiParam({ name: 'id', required: true, description: 'Employee ID' })
    @ApiOperation({ summary: 'Delete employee (Admin only)' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted' })
    async delete(
        @Param('id') id: string,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.employeesService.deleteAsync(id, performerId);
        if (!result.isSuccess) {
            throw new NotFoundException(result.error);
        }
    }
}

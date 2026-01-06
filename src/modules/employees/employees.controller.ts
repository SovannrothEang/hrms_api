import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { RoleName } from 'src/common/enums/roles.enum';
import { Auth } from 'src/common/decorators/roles.decorator';

@Controller('employees')
@ApiTags('Employees')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Auth(RoleName.ADMIN)
    @ApiOperation({ summary: 'Create new employee' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Employee successfully created',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Bad Request (e.g., email already exists)',
    })
    create() {
        return 'hi';
    }
}

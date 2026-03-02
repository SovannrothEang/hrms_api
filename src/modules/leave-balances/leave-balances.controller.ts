import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { LeaveBalancesService } from './leave-balances.service';
import { BusinessError } from '../../common/exceptions/business-error.exception';
import {
    LeaveBalanceCreateDto,
    LeaveBalanceUpdateDto,
    LeaveBalanceResponseDto,
    LeaveBalanceBulkCreateDto,
} from './dtos/leave-balance.dto';
import { LeaveBalanceQueryDto } from './dtos/leave-balance-query.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../common/enums/roles.enum';

@ApiTags('Leave Balances')
@Auth(RoleName.ADMIN, RoleName.HR_MANAGER)
@Controller('leave-balances')
export class LeaveBalancesController {
    constructor(private readonly leaveBalancesService: LeaveBalancesService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a leave balance' })
    @ApiResponse({ status: HttpStatus.CREATED, type: LeaveBalanceResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async create(
        @Body() dto: LeaveBalanceCreateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leaveBalancesService.createAsync(dto, performerId);
        if (!result.isSuccess) {
            throw new BusinessError(result.error || 'Failed to create leave balance');
        }
        return result.getData();
    }

    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create multiple leave balances for an employee' })
    @ApiResponse({ status: HttpStatus.CREATED, type: [LeaveBalanceResponseDto] })
    async createBulk(
        @Body() dto: LeaveBalanceBulkCreateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leaveBalancesService.createBulkAsync(dto, performerId);
        if (!result.isSuccess) {
            throw new BusinessError(result.error || 'Failed to create leave balances');
        }
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all leave balances' })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll(@Query() query: LeaveBalanceQueryDto) {
        const result = await this.leaveBalancesService.findAllAsync(query);
        return result.getData();
    }

    @Get('employee/:employeeId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get leave balances for a specific employee' })
    @ApiParam({ name: 'employeeId', required: true, description: 'Employee ID' })
    @ApiQuery({ name: 'year', required: false, type: Number })
    @ApiResponse({ status: HttpStatus.OK })
    async findByEmployee(
        @Param('employeeId') employeeId: string,
        @Query('year') year?: number,
    ) {
        const result = await this.leaveBalancesService.findByEmployeeAsync(
            employeeId,
            year,
        );
        if (!result.isSuccess) {
            throw new BusinessError(result.error || 'Employee not found');
        }
        return result.getData();
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update a leave balance' })
    @ApiParam({ name: 'id', required: true, description: 'Leave balance ID' })
    @ApiResponse({ status: HttpStatus.OK, type: LeaveBalanceResponseDto })
    async update(
        @Param('id') id: string,
        @Body() dto: LeaveBalanceUpdateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leaveBalancesService.updateAsync(id, dto, performerId);
        if (!result.isSuccess) {
            throw new BusinessError(result.error || 'Leave balance not found');
        }
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a leave balance' })
    @ApiParam({ name: 'id', required: true, description: 'Leave balance ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted' })
    async delete(
        @Param('id') id: string,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leaveBalancesService.deleteAsync(id, performerId);
        if (!result.isSuccess) {
            throw new BusinessError(result.error || 'Leave balance not found');
        }
    }
}

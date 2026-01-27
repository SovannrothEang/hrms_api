import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
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
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { PayrollsService } from './payrolls.service';
import { ProcessPayrollDto } from './dtos/process-payroll.dto';
import { PayrollDto } from './dtos/payroll.dto';
import { PayrollSummaryDto } from './dtos/payroll-summary.dto';
import {
    GeneratePayrollDto,
    GeneratePayrollResultDto,
} from './dtos/generate-payroll.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Payroll - Payrolls')
@Controller(['payrolls', 'payroll'])
@Auth(RoleName.ADMIN, RoleName.HR)
export class PayrollsController {
    constructor(private readonly service: PayrollsService) {}

    @Post('process')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a draft payroll with calculated values' })
    @ApiResponse({ status: HttpStatus.CREATED, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Validation error',
    })
    async process(
        @Body() dto: ProcessPayrollDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.createDraftAsync(dto, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to process payroll',
            );
        }
        return result.getData();
    }

    @Get('summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get payroll summary with totals and breakdowns' })
    @ApiQuery({
        name: 'year',
        required: false,
        type: Number,
        description: 'Filter by year',
    })
    @ApiQuery({
        name: 'month',
        required: false,
        type: Number,
        description: 'Filter by month (1-12)',
    })
    @ApiQuery({
        name: 'departmentId',
        required: false,
        description: 'Filter by department',
    })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollSummaryDto })
    async getSummary(
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Query('departmentId') departmentId?: string,
    ) {
        const result = await this.service.getSummaryAsync({
            year: year ? parseInt(year, 10) : undefined,
            month: month ? parseInt(month, 10) : undefined,
            departmentId,
        });
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to get payroll summary',
            );
        }
        return result.getData();
    }

    @Post('generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Bulk generate payrolls for multiple employees',
    })
    @ApiResponse({ status: HttpStatus.CREATED, type: GeneratePayrollResultDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Validation error',
    })
    async generate(
        @Body() dto: GeneratePayrollDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.generateBulkAsync(dto, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to generate payrolls',
            );
        }
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'List all payrolls with optional filters (Paginated)',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page',
    })
    @ApiQuery({
        name: 'employeeId',
        required: false,
        description: 'Filter by employee',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        description: 'Filter by status (PENDING, PROCESSED, PAID)',
    })
    @ApiQuery({
        name: 'year',
        required: false,
        type: Number,
        description: 'Filter by year',
    })
    @ApiQuery({
        name: 'month',
        required: false,
        type: Number,
        description: 'Filter by month (1-12)',
    })
    @ApiResponse({ status: HttpStatus.OK, type: [PayrollDto] })
    async findAll(
        @Query() pagination: PaginationDto,
        @Query('employeeId') employeeId?: string,
        @Query('status') status?: string,
        @Query('year') year?: string,
        @Query('month') month?: string,
    ) {
        const result = await this.service.findAllPaginatedAsync(
            pagination.page || 1,
            pagination.limit || 10,
            {
                employeeId,
                status,
                year: year ? parseInt(year, 10) : undefined,
                month: month ? parseInt(month, 10) : undefined,
            },
        );
        if (!result.isSuccess) {
            throw new Error(result.error ?? 'Failed to fetch payrolls');
        }
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get payroll by ID with items and tax details' })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async findOne(@Param('id') id: string) {
        const result = await this.service.findByIdAsync(id);
        if (!result.isSuccess) {
            throw new NotFoundException(result.error ?? 'Payroll not found');
        }
        return result.getData();
    }

    @Patch(':id/finalize')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Finalize a pending payroll (changes status to PROCESSED)',
    })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot finalize non-pending payroll',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async finalize(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.finalizeAsync(id, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to finalize payroll',
            );
        }
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a pending payroll' })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot delete non-pending payroll',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to delete payroll',
            );
        }
    }
}

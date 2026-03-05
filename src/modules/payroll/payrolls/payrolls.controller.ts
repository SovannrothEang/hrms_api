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
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { MarkPayrollPaidDto } from './dtos/mark-payroll-paid.dto';
import { PayrollQueryDto } from './dtos/payroll-query.dto';
import { UpdatePayrollDto } from './dtos/update-payroll.dto';
import { ResultPagination } from '../../../common/logic/result-pagination';

@ApiTags('Payrolls')
@Controller('payrolls')
@Auth()
export class PayrollsController {
    constructor(private readonly service: PayrollsService) {}

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'List all payrolls with optional filters',
    })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll(
        @Query() query: PayrollQueryDto,
    ): Promise<ResultPagination<PayrollDto>> {
        const result = await this.service.findAllPaginatedAsync(query);
        if (!result.isSuccess) throw new BadRequestException(result.error);
        return result.getData();
    }

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Update a pending payroll (recalculates tax and net)',
    })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot update non-pending payroll',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdatePayrollDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.updateAsync(id, dto, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to update payroll',
            );
        }
        return result.getData();
    }

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Auth([RoleName.ADMIN])
    @Patch(':id/mark-paid')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Mark a processed payroll as paid',
    })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot mark as paid: payroll must be in PROCESSED status',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async markAsPaid(
        @Param('id') id: string,
        @Body() dto: MarkPayrollPaidDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.markAsPaidAsync(
            id,
            dto.paymentDate ? new Date(dto.paymentDate) : undefined,
            userId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(
                result.error ?? 'Failed to mark payroll as paid',
            );
        }
        return result.getData();
    }

    @Auth([RoleName.ADMIN, RoleName.HR_MANAGER])
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

    @Get('payslip/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Download personal payslip as PDF' })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    async getMyPayslipPdf(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
        @CurrentUser('roles') roles: string[],
        @Res() res: Response,
    ) {
        const isAdminOrManager =
            roles.includes(RoleName.ADMIN) ||
            roles.includes(RoleName.HR_MANAGER);

        const result = isAdminOrManager
            ? await this.service.downloadAnyPayslipPdfAsync(id)
            : await this.service.downloadPayslipPdfAsync(id, userId);

        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }

        const { buffer, filename } = result.getData();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
}

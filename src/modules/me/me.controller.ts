import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Query,
    Param,
    Logger,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
    ApiParam,
} from '@nestjs/swagger';
import { LeavesService } from '../leaves/leaves.service';
import { AttendancesService } from '../attendances/attendances.service';
import { PayrollsService } from '../payroll/payrolls/payrolls.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceQueryDto } from '../attendances/dtos/attendance-query.dto';
import {
    MeAttendanceResponseDto,
    MeAttendanceSummaryDto,
} from '../attendances/dtos/me-attendance-response.dto';
import { MePayslipResponseDto } from '../payroll/payrolls/dtos/me-payslip-response.dto';
import { MeLeaveBalanceResponseDto } from '../leaves/dtos/me-leave-balance-response.dto';
import { LeaveQueryDto } from '../leaves/dtos/leave-query.dto';
import { MeLeaveRequestResponseDto } from '../leaves/dtos/me-leave-request-response.dto';
import { PayrollDto } from '../payroll/payrolls/dtos/payroll.dto';
import { LeaveRequestDto } from '../leaves/dtos/leave-request.dto';

@ApiTags('Me')
@Auth()
@Controller('me')
export class MeController {
    private readonly logger = new Logger(MeController.name);

    constructor(
        private readonly leavesService: LeavesService,
        private readonly attendancesService: AttendancesService,
        private readonly payrollsService: PayrollsService,
    ) {}

    @Get('attendances')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user attendances' })
    @ApiResponse({ status: HttpStatus.OK, type: MeAttendanceResponseDto })
    async getMyAttendances(
        @CurrentUser('sub') userId: string,
        @Query() query: AttendanceQueryDto,
    ): Promise<MeAttendanceResponseDto> {
        const result = await this.attendancesService.getMeAttendance(
            userId,
            query,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('attendances/summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user attendance summary only' })
    @ApiResponse({ status: HttpStatus.OK, type: MeAttendanceSummaryDto })
    async getMyAttendanceSummary(
        @CurrentUser('sub') userId: string,
        @Query() query: AttendanceQueryDto,
    ): Promise<MeAttendanceSummaryDto> {
        const result = await this.attendancesService.getMeAttendanceSummary(
            userId,
            query,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('payrolls')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user payslips and YTD summary' })
    @ApiQuery({
        name: 'year',
        required: false,
        type: String,
        description: 'Year to filter payslips',
    })
    @ApiResponse({ status: HttpStatus.OK, type: MePayslipResponseDto })
    async getMyPayrolls(
        @CurrentUser('sub') userId: string,
        @Query('year') year?: string,
    ): Promise<MePayslipResponseDto> {
        const result = await this.payrollsService.getMePayslipsAsync(
            userId,
            year ? parseInt(year, 10) : undefined,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('leave-balances')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user leave balances' })
    @ApiQuery({
        name: 'year',
        required: false,
        type: Number,
        description: 'Year to get balances for (defaults to current year)',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        type: MeLeaveBalanceResponseDto,
    })
    async getMyLeaveBalance(
        @CurrentUser('sub') userId: string,
        @Query('year') year?: number,
    ): Promise<MeLeaveBalanceResponseDto> {
        const result = await this.leavesService.getMyLeaveBalancesAsync(
            userId,
            year,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('leave-requests')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user leave requests' })
    @ApiResponse({
        status: HttpStatus.OK,
        type: MeLeaveRequestResponseDto,
    })
    async getMyLeaveRequests(
        @CurrentUser('sub') userId: string,
        @Query() query: LeaveQueryDto,
    ): Promise<MeLeaveRequestResponseDto> {
        const result = await this.leavesService.getMyLeaveRequestsAsync(
            userId,
            query,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('payrolls/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user payroll details by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Payroll ID' })
    @ApiResponse({ status: HttpStatus.OK, type: PayrollDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Payroll not found or access denied',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Payroll not found',
    })
    async getMyPayrollById(
        @CurrentUser('sub') userId: string,
        @Param('id') payrollId: string,
    ): Promise<PayrollDto> {
        const result = await this.payrollsService.getMyPayrollByIdAsync(
            userId,
            payrollId,
        );
        if (!result.isSuccess) {
            this.logger.error(result.error);
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Get('leave-requests/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user leave request details by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Leave request ID' })
    @ApiResponse({ status: HttpStatus.OK, type: LeaveRequestDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Leave request not found or access denied',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Leave request not found',
    })
    async getMyLeaveRequestById(
        @CurrentUser('sub') userId: string,
        @Param('id') leaveRequestId: string,
    ): Promise<LeaveRequestDto> {
        const result = await this.leavesService.getMyLeaveRequestByIdAsync(
            userId,
            leaveRequestId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }
}

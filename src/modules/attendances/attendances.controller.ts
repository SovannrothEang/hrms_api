import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    HttpCode,
    HttpStatus,
    BadRequestException,
    ParseBoolPipe,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AttendancesService } from './attendances.service';
import { CheckInDto } from './dtos/check-in.dto';
import { CheckOutDto } from './dtos/check-out.dto';
import { AttendanceQueryDto } from './dtos/attendance-query.dto';

import { RoleName } from '../../common/enums/roles.enum';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResultPagination } from '../../common/logic/result-pagination';
import { AttendanceDto } from './dtos/attendance.dto';
import { MeAttendanceResponseDto } from './dtos/me-attendance-response.dto';
import { QrManagerService } from './services/qr-manager.service';

@ApiTags('Attendances')
@Auth()
@Controller(['attendances', 'attendance'])
export class AttendancesController {
    constructor(
        private readonly attendancesService: AttendancesService,
        private readonly qrManagerService: QrManagerService,
    ) {}

    @Auth([RoleName.ADMIN, RoleName.HR])
    @Get('qr/in')
    @ApiOperation({ summary: 'Generate QR code for clock-in' })
    async generateQrIn() {
        return { token: await this.qrManagerService.generateToken('IN') };
    }

    @Auth([RoleName.ADMIN, RoleName.HR])
    @Get('qr/out')
    @ApiOperation({ summary: 'Generate QR code for clock-out' })
    async generateQrOut() {
        return { token: await this.qrManagerService.generateToken('OUT') };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all attendances' })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll(
        @Query() query: AttendanceQueryDto,
    ): Promise<ResultPagination<AttendanceDto>> {
        const result =
            await this.attendancesService.findAllFilteredAsync(query);
        return result.getData();
    }

    @Get('me')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user attendances' })
    @ApiResponse({ status: HttpStatus.OK, type: MeAttendanceResponseDto })
    async getMeAttendance(
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

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', required: true, description: 'Attendance ID' })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiOperation({ summary: 'Get attendance by ID' })
    @ApiResponse({ status: HttpStatus.OK })
    async findOne(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        return await this.attendancesService.findOneByIdAsync(
            id,
            childIncluded,
        );
    }

    @Post(['check-in', 'clock-in'])
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Check in an employee' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async checkIn(
        @Body() dto: CheckInDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.attendancesService.checkIn(dto, performerId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Post(['check-out', 'clock-out'])
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Check out an employee' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async checkOut(
        @Body() dto: CheckOutDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.attendancesService.checkOut(dto, performerId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }
}

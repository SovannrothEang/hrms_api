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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AttendancesService } from './attendances.service';
import { CheckInDto } from './dtos/check-in.dto';
import { CheckOutDto } from './dtos/check-out.dto';
import { AttendanceDto } from './dtos/attendance.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attendances')
@Auth()
@Controller('attendances')
export class AttendancesController {
    constructor(private readonly attendancesService: AttendancesService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all attendances' })
    @ApiResponse({ status: HttpStatus.OK, type: [AttendanceDto] })
    async findAll(@Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean) {
        return await this.attendancesService.findAllAsync(childIncluded);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get attendance by ID' })
    @ApiResponse({ status: HttpStatus.OK, type: AttendanceDto })
    async findOne(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean,
    ) {
        return await this.attendancesService.findOneByIdAsync(id, childIncluded);
    }

    @Post('check-in')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Check in an employee' })
    @ApiResponse({ status: HttpStatus.CREATED, type: AttendanceDto })
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

    @Post('check-out')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Check out an employee' })
    @ApiResponse({ status: HttpStatus.OK, type: AttendanceDto })
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

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
    ParseBoolPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { LeaveRequestDto } from './dtos/leave-request.dto';
import { LeaveRequestCreateDto } from './dtos/leave-request-create.dto';
import { LeaveRequestStatusUpdateDto } from './dtos/leave-request-status-update.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leaves')
@Auth()
@Controller('takeleave')
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all leave requests' })
    @ApiResponse({ status: HttpStatus.OK, type: [LeaveRequestDto] })
    @ApiParam({ name: 'childIncluded', required: false, type: 'boolean' })
    async findAll(
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        return await this.leavesService.findAllAsync(childIncluded);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get leave request by ID' })
    @ApiResponse({ status: HttpStatus.OK, type: LeaveRequestDto })
    @ApiParam({ name: 'childIncluded', required: false, type: 'boolean' })
    async findOne(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        return await this.leavesService.findOneByIdAsync(id, childIncluded);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new leave request' })
    @ApiResponse({ status: HttpStatus.CREATED, type: LeaveRequestDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async create(
        @Body() dto: LeaveRequestCreateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leavesService.createAsync(dto, performerId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Patch(':id/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update leave request status' })
    @ApiResponse({ status: HttpStatus.OK, type: LeaveRequestDto })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: LeaveRequestStatusUpdateDto,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.leavesService.updateStatusAsync(
            id,
            dto,
            performerId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete pending leave request' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted' })
    async delete(@Param('id') id: string) {
        const result = await this.leavesService.deleteAsync(id);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
    }
}

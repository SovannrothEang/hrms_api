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
    ParseIntPipe,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { LeavesService } from './leaves.service';

import { LeaveRequestCreateDto } from './dtos/leave-request-create.dto';
import { LeaveRequestStatusUpdateDto } from './dtos/leave-request-status-update.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leaves')
@Auth()
@Controller(['takeleave', 'leave-requests'])
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all leave requests (Paginated)' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Default 1',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Default 10',
    })
    @ApiQuery({ name: 'employeeId', required: false, type: String })
    async findAll(
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true }))
        limit: number = 10,
        @Query('employeeId') employeeId?: string,
    ) {
        const result = await this.leavesService.findAllPaginatedAsync(
            page || 1,
            limit || 10,
            childIncluded,
            employeeId,
        );
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get leave request by ID' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiParam({ name: 'id', required: true, description: 'Leave request ID' })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
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
    @ApiResponse({ status: HttpStatus.CREATED })
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
    @ApiResponse({ status: HttpStatus.OK })
    @ApiParam({ name: 'id', required: true, description: 'Leave request ID' })
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
    @ApiParam({ name: 'id', required: true, description: 'Leave request ID' })
    async delete(@Param('id') id: string) {
        const result = await this.leavesService.deleteAsync(id);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
    }
}

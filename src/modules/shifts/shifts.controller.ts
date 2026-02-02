import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dtos/create-shift.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';

import { Query } from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { ShiftDto } from './dtos/shift.dto';

@ApiTags('Shifts')
@Controller('shifts')
@Auth(RoleName.ADMIN, RoleName.HR)
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new shift' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async create(
        @Body() dto: CreateShiftDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.shiftsService.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all shifts' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of shifts' })
    async findAll(): Promise<ShiftDto[]> {
        const result = await this.shiftsService.findAllAsync();
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get shift by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Shift ID' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOne(@Param('id') id: string) {
        const result = await this.shiftsService.findOneByIdAsync(id);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete shift' })
    @ApiParam({ name: 'id', required: true, description: 'Shift ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.shiftsService.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
    }
}

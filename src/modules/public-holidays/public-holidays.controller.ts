import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    HttpCode,
    HttpStatus,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { PublicHolidaysService } from './public-holidays.service';
import { CreatePublicHolidayDto } from './dtos/create-public-holiday.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { PublicHolidayDto } from './dtos/public-holiday.dto';

@ApiTags('Public Holidays')
@Controller('public-holidays')
@Auth(RoleName.ADMIN, RoleName.HR)
export class PublicHolidaysController {
    constructor(private readonly service: PublicHolidaysService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new public holiday' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async create(
        @Body() dto: CreatePublicHolidayDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess)
            throw new BadRequestException(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all public holidays (Paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of public holidays' })
    async findAll(@Query() pagination: PaginationDto): Promise<ResultPagination<PublicHolidayDto>> {
        return await this.service.findAllPaginatedAsync(
            pagination.page || 1,
            pagination.limit || 10,
        );
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get public holiday by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Public holiday ID' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOne(@Param('id') id: string) {
        const result = await this.service.findOneByIdAsync(id);
        if (!result.isSuccess)
            throw new NotFoundException(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete public holiday' })
    @ApiParam({ name: 'id', required: true, description: 'Public holiday ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess)
            throw new NotFoundException(result.error ?? 'Unknown Error');
    }
}

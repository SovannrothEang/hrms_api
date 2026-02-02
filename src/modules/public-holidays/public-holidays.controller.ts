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
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
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
    @ApiOperation({ summary: 'Get all public holidays' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of public holidays',
    })
    async findAll(): Promise<PublicHolidayDto[]> {
        const result = await this.service.findAllAsync();
        return result.getData();
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

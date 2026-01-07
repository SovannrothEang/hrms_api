import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { PublicHolidaysService } from './public-holidays.service';
import { CreatePublicHolidayDto } from './dtos/create-public-holiday.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Public Holidays')
@Controller('public-holidays')
@Auth(RoleName.ADMIN, RoleName.HR)
export class PublicHolidaysController {
    constructor(private readonly service: PublicHolidaysService) { }

    @Post()
    async create(@Body() dto: CreatePublicHolidayDto, @CurrentUser('sub') userId: string) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
        return result.getData();
    }

    @Get()
    async findAll() {
        const result = await this.service.findAllAsync();
        return result.getData();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const result = await this.service.findOneByIdAsync(id);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
        return result.getData();
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
    }
}

import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dtos/create-shift.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';

@ApiTags('Shifts')
@Controller('shifts')
@Auth(RoleName.ADMIN, RoleName.HR)
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) { }

    @Post()
    async create(@Body() dto: CreateShiftDto, @CurrentUser('sub') userId: string) {
        const result = await this.shiftsService.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
        return result.getData();
    }

    @Get()
    async findAll() {
        const result = await this.shiftsService.findAllAsync();
        return result.getData();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const result = await this.shiftsService.findOneByIdAsync(id);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
        return result.getData();
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.shiftsService.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? "Unknown Error");
    }
}

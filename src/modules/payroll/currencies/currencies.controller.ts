import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dtos/create-currency.dto';

@ApiTags('Payroll - Currencies')
@Controller('currencies')
@Auth(RoleName.ADMIN, RoleName.HR)
export class CurrenciesController {
    constructor(private readonly service: CurrenciesService) { }

    @Post()
    async create(@Body() dto: CreateCurrencyDto, @CurrentUser('sub') userId: string) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    async findAll() {
        const result = await this.service.findAllAsync();
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const result = await this.service.findOneByIdAsync(id);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
    }
}

import { Body, Controller, Delete, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new currency' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async create(@Body() dto: CreateCurrencyDto, @CurrentUser('sub') userId: string) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all currencies' })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll() {
        const result = await this.service.findAllAsync();
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get currency by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Currency ID' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async findOne(@Param('id') id: string) {
        const result = await this.service.findOneByIdAsync(id);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete currency' })
    @ApiParam({ name: 'id', required: true, description: 'Currency ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
    }
}


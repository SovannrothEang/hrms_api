import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { TaxBracketsService } from './tax-brackets.service';
import { CreateTaxBracketDto } from './dtos/create-tax-bracket.dto';

@ApiTags('Payroll - Tax Brackets')
@Controller('tax-brackets')
@Auth(RoleName.ADMIN, RoleName.HR)
export class TaxBracketsController {
    constructor(private readonly service: TaxBracketsService) { }

    @Post()
    async create(@Body() dto: CreateTaxBracketDto, @CurrentUser('sub') userId: string) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @ApiQuery({ name: 'country', required: false })
    @ApiQuery({ name: 'year', required: false, type: Number })
    async findAll(@Query('country') country?: string, @Query('year') year?: number) {
        const result = await this.service.findAllAsync(country, year ? Number(year) : undefined);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess) throw new Error(result.error ?? 'Unknown Error');
    }
}

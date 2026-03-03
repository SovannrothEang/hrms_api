import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dtos/create-exchange-rate.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Payroll - Exchange Rates')
@Controller('exchange-rates')
@Auth(RoleName.ADMIN, RoleName.HR_MANAGER)
export class ExchangeRatesController {
    constructor(private readonly service: ExchangeRatesService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create or update exchange rate' })
    @ApiResponse({ status: HttpStatus.OK })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async create(
        @Body() dto: CreateExchangeRateDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess)
            throw new BadRequestException(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all exchange rates' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of exchange rates' })
    async findAll() {
        const result = await this.service.findAllAsync();
        if (!result.isSuccess)
            throw new BadRequestException(result.error ?? 'Unknown Error');
        return result.getData();
    }
}

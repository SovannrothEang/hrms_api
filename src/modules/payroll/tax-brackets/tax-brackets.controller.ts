import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    HttpCode,
    HttpStatus,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { TaxBracketsService } from './tax-brackets.service';
import { CreateTaxBracketDto } from './dtos/create-tax-bracket.dto';

@ApiTags('Payroll - Tax Brackets')
@Controller('tax-brackets')
@Auth(RoleName.ADMIN, RoleName.HR)
export class TaxBracketsController {
    constructor(private readonly service: TaxBracketsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new tax bracket' })
    @ApiResponse({ status: HttpStatus.CREATED })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST })
    async create(
        @Body() dto: CreateTaxBracketDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.service.createAsync(dto, userId);
        if (!result.isSuccess)
            throw new BadRequestException(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all tax brackets' })
    @ApiQuery({
        name: 'country',
        required: false,
        description: 'Filter by country code',
    })
    @ApiQuery({
        name: 'year',
        required: false,
        type: Number,
        description: 'Filter by tax year',
    })
    @ApiResponse({ status: HttpStatus.OK })
    async findAll(
        @Query('country') country?: string,
        @Query('year') year?: number,
    ) {
        const result = await this.service.findAllAsync(
            country,
            year ? Number(year) : undefined,
        );
        if (!result.isSuccess)
            throw new BadRequestException(result.error ?? 'Unknown Error');
        return result.getData();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete tax bracket' })
    @ApiParam({ name: 'id', required: true, description: 'Tax bracket ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        const result = await this.service.deleteAsync(id, userId);
        if (!result.isSuccess)
            throw new NotFoundException(result.error ?? 'Unknown Error');
    }
}

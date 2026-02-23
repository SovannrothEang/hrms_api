import {
    Controller,
    Get,
    Put,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateCompanySettingsDto } from './dtos/update-company-settings.dto';
import { CompanySettingsResponseDto } from './dtos/company-settings-response.dto';
import { AuthWithCsrf } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../common/enums/roles.enum';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
    private readonly logger = new Logger(SettingsController.name);

    constructor(private readonly settingsService: SettingsService) {}

    @Get('company')
    @AuthWithCsrf()
    @ApiOperation({ summary: 'Get company settings' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return company settings',
        type: CompanySettingsResponseDto,
    })
    async getCompanySettings(): Promise<CompanySettingsResponseDto> {
        const result = await this.settingsService.getCompanySettings();
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Put('company')
    @AuthWithCsrf()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update company settings' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Company settings updated successfully',
        type: CompanySettingsResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    async updateCompanySettings(
        @Body() dto: UpdateCompanySettingsDto,
        @CurrentUser('sub') userId: string,
    ): Promise<CompanySettingsResponseDto> {
        const result = await this.settingsService.updateCompanySettings(
            dto,
            userId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }
}

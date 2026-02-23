import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dtos/update-company-settings.dto';
import { CompanySettingsResponseDto } from './dtos/company-settings-response.dto';
import { Result } from '../../common/logic/result';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getCompanySettings(): Promise<
        Result<CompanySettingsResponseDto>
    > {
        try {
            const settings = await this.prisma.client.companySettings.findFirst(
                {
                    where: {
                        isActive: true,
                        isDeleted: false,
                    },
                    include: {
                        baseCurrency: true,
                    },
                },
            );

            if (!settings) {
                const defaultSettings =
                    await this.prisma.client.companySettings.create({
                        data: {
                            name: 'HRFlow Inc.',
                            email: 'hr@hrflow.com',
                            phone: '(555) 123-4567',
                            address: '123 Business Street, Tech City',
                            baseCurrencyCode: 'USD',
                            fiscalYearStartMonth: 1,
                            timezone: 'UTC-8',
                            dateFormat: 'mdy',
                            workWeekStarts: 'monday',
                        },
                    });
                return Result.ok(this.mapToResponse(defaultSettings));
            }

            return Result.ok(this.mapToResponse(settings));
        } catch (error) {
            this.logger.error('Failed to get company settings', error);
            return Result.fail('Failed to get company settings');
        }
    }

    async updateCompanySettings(
        dto: UpdateCompanySettingsDto,
        userId: string,
    ): Promise<Result<CompanySettingsResponseDto>> {
        try {
            const existingSettings =
                await this.prisma.client.companySettings.findFirst({
                    where: {
                        isActive: true,
                        isDeleted: false,
                    },
                });

            let settings;
            if (existingSettings) {
                settings = await this.prisma.client.companySettings.update({
                    where: { id: existingSettings.id },
                    data: {
                        name: dto.name,
                        email: dto.email,
                        phone: dto.phone,
                        address: dto.address,
                        baseCurrencyCode: dto.baseCurrencyCode,
                        fiscalYearStartMonth: dto.fiscalYearStartMonth,
                        timezone: dto.timezone ?? existingSettings.timezone,
                        dateFormat:
                            dto.dateFormat ?? existingSettings.dateFormat,
                        workWeekStarts:
                            dto.workWeekStarts ??
                            existingSettings.workWeekStarts,
                        performBy: userId,
                    },
                });
            } else {
                settings = await this.prisma.client.companySettings.create({
                    data: {
                        name: dto.name,
                        email: dto.email,
                        phone: dto.phone,
                        address: dto.address,
                        baseCurrencyCode: dto.baseCurrencyCode,
                        fiscalYearStartMonth: dto.fiscalYearStartMonth,
                        timezone: dto.timezone ?? 'UTC',
                        dateFormat: dto.dateFormat ?? 'mdy',
                        workWeekStarts: dto.workWeekStarts ?? 'monday',
                        performBy: userId,
                    },
                });
            }

            this.logger.log(`Company settings updated by user ${userId}`);
            return Result.ok(this.mapToResponse(settings));
        } catch (error) {
            this.logger.error('Failed to update company settings', error);
            return Result.fail('Failed to update company settings');
        }
    }

    private mapToResponse(
        settings: any,
    ): CompanySettingsResponseDto {
        return {
            id: settings.id,
            name: settings.name,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            baseCurrencyCode: settings.baseCurrencyCode,
            fiscalYearStartMonth: settings.fiscalYearStartMonth,
            timezone: settings.timezone,
            dateFormat: settings.dateFormat,
            workWeekStarts: settings.workWeekStarts,
            createdAt: settings.createdAt,
            updatedAt: settings.updatedAt,
        };
    }
}

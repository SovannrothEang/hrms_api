import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PushNotificationService } from './push-notification.service';

@ApiTags('notifications')
@Controller('notifications')
@Auth()
export class NotificationsController {
    constructor(
        private readonly notificationsService: PushNotificationService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get user notifications' })
    async getNotifications(
        @CurrentUser('sub') userId: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        const result = await this.notificationsService.getNotifications(
            userId,
            limit ? Number(limit) : undefined,
            offset ? Number(offset) : undefined,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async markAsRead(
        @CurrentUser('sub') userId: string,
        @Param('id') id: string,
    ) {
        const result = await this.notificationsService.markAsRead(id, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Post('register-token')
    @ApiOperation({ summary: 'Register FCM token for push notifications' })
    async registerToken(
        @CurrentUser('sub') userId: string,
        @Body('token') token: string,
    ) {
        const result = await this.notificationsService.registerFcmToken(
            userId,
            token,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }
}

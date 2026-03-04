import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationProcessor } from './processors/notification.processor';
import { NOTIFICATION_QUEUE } from './constants';

@Global()
@Module({
    imports: [
        MailerModule.forRoot({
            transport: {
                host: process.env.SMTP_HOST || 'smtp.example.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || 'user@example.com',
                    pass: process.env.SMTP_PASS || 'topsecret',
                },
            },
            defaults: {
                from:
                    process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
            },
        }),
        BullModule.registerQueue({
            name: NOTIFICATION_QUEUE,
        }),
    ],
    controllers: [NotificationsController],
    providers: [EmailService, PushNotificationService, NotificationProcessor],
    exports: [EmailService, PushNotificationService],
})
export class NotificationsModule {}

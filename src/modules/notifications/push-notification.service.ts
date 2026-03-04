import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import { NOTIFICATION_QUEUE, SEND_PUSH_JOB } from './constants';
import { Result } from 'src/common/logic/result';

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(NOTIFICATION_QUEUE)
        private readonly notificationQueue: Queue,
    ) {}

    async sendNotification(
        userId: string,
        title: string,
        body: string,
        type: string,
        metadata?: any,
    ): Promise<Result<boolean>> {
        try {
            // 1. Persist to DB
            const notification = await this.prisma.client.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type,
                    metadata,
                },
            });

            // 2. Add to Queue for processing (sending the actual push)
            await this.notificationQueue.add(SEND_PUSH_JOB, {
                notificationId: notification.id,
                userId,
                title,
                body,
                metadata,
            });

            return Result.ok(true);
        } catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
            return Result.fail('Failed to queue notification');
        }
    }

    async registerFcmToken(
        userId: string,
        fcmToken: string,
    ): Promise<Result<boolean>> {
        try {
            await this.prisma.client.user.update({
                where: { id: userId },
                data: { fcmToken },
            });
            return Result.ok(true);
        } catch (error) {
            this.logger.error(`Failed to register FCM token: ${error.message}`);
            return Result.fail('Failed to update FCM token');
        }
    }

    async getNotifications(userId: string, limit = 20, offset = 0) {
        try {
            const [items, total] = await Promise.all([
                this.prisma.client.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                this.prisma.client.notification.count({
                    where: { userId },
                }),
            ]);

            return Result.ok({ items, total });
        } catch (error) {
            this.logger.error(
                `Failed to fetch notifications: ${error.message}`,
            );
            return Result.fail('Failed to fetch notifications');
        }
    }

    async markAsRead(
        notificationId: string,
        userId: string,
    ): Promise<Result<boolean>> {
        try {
            await this.prisma.client.notification.update({
                where: { id: notificationId, userId },
                data: { isRead: true },
            });
            return Result.ok(true);
        } catch (error) {
            this.logger.error(
                `Failed to mark notification as read: ${error.message}`,
            );
            return Result.fail('Failed to update notification status');
        }
    }
}

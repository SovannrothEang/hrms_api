import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/common/services/prisma/prisma.service';
import { NOTIFICATION_QUEUE, SEND_PUSH_JOB } from '../constants';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();

        // Initialize Firebase Admin if not already initialized
        if (admin.apps.length === 0) {
            try {
                // In production, you would use a service account JSON
                // admin.initializeApp({
                //     credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
                // });

                // For now, initializing with application default or dummy for setup
                admin.initializeApp();
            } catch (error) {
                this.logger.warn(
                    `Firebase Admin failed to initialize: ${error.message}. Push notifications will fail but jobs will still process.`,
                );
            }
        }
    }

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case SEND_PUSH_JOB:
                return await this.handleSendPush(job.data);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async handleSendPush(data: any) {
        const { userId, title, body, metadata } = data;

        try {
            // Get user's FCM token
            const user = await this.prisma.client.user.findUnique({
                where: { id: userId },
                select: { fcmToken: true },
            });

            if (!user?.fcmToken) {
                this.logger.debug(
                    `No FCM token for user ${userId}, skipping push.`,
                );
                return;
            }

            const message: admin.messaging.Message = {
                notification: {
                    title,
                    body,
                },
                data: metadata
                    ? Object.keys(metadata).reduce((acc, key) => {
                          acc[key] = String(metadata[key]);
                          return acc;
                      }, {})
                    : {},
                token: user.fcmToken,
            };

            const response = await admin.messaging().send(message);
            this.logger.log(
                `Successfully sent push to user ${userId}: ${response}`,
            );
            return response;
        } catch (error) {
            this.logger.error(
                `Error sending push notification to user ${userId}: ${error.message}`,
            );
            // We don't necessarily want to retry if the token is invalid
            if (error.code === 'messaging/registration-token-not-registered') {
                this.logger.warn(
                    `Token for user ${userId} is no longer valid. Clearing it.`,
                );
                await this.prisma.client.user.update({
                    where: { id: userId },
                    data: { fcmToken: null },
                });
            }
            throw error;
        }
    }
}

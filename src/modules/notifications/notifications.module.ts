import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Global()
@Module({
    imports: [
        MailerModule.forRoot({
            transport: {
                host: 'smtp.example.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'user@example.com',
                    pass: 'topsecret', // In prod, use env vars
                },
            },
            defaults: {
                from: '"No Reply" <noreply@example.com>',
            },
        }),
    ],
    providers: [EmailService],
    exports: [EmailService], // Export so valid for usage in other modules
})
export class NotificationsModule {}

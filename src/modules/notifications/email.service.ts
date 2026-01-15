import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly mailerService: MailerService) {}

    sendLeaveRequestNotification(to: string, leaveId: string) {
        this.logger.log(
            `[MOCK EMAIL] Sending Leave Request Notification to ${to} for Leave ${leaveId}`,
        );
        // In real impl:
        /*
        await this.mailerService.sendMail({
            to,
            subject: 'New Leave Request',
            template: './leave-request', // or html
            context: { name: 'User', leaveId }
        });
        */
        return true;
    }

    sendLeaveStatusUpdateNotification(
        to: string,
        leaveId: string,
        status: string,
    ) {
        this.logger.log(
            `[MOCK EMAIL] Sending Leave Status Update to ${to}: Leave ${leaveId} is now ${status}`,
        );
        /*
        await this.mailerService.sendMail({
            to,
            subject: `Leave Request ${status}`,
            html: `<p>Your leave request has been ${status}</p>`
        });
        */
        return true;
    }
}

import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../../src/modules/notifications/email.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

const mockMailerService = {
    sendMail: jest.fn(),
};

describe('EmailService', () => {
    let service: EmailService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                { provide: MailerService, useValue: mockMailerService },
            ],
        }).compile();

        service = module.get<EmailService>(EmailService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log leave request notification', async () => {
        const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        await service.sendLeaveRequestNotification('to', 'id', 'name');
        expect(spy).toHaveBeenCalled();
    });

    it('should log leave status update', async () => {
        const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        await service.sendLeaveStatusUpdateNotification('to', 'id', 'APPROVED');
        expect(spy).toHaveBeenCalled();
    });
});

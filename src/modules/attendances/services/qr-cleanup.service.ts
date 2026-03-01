import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QrCleanupService {
    private readonly logger = new Logger(QrCleanupService.name);
    private readonly qrDirectory = path.join(process.cwd(), 'public', 'qrs');

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    handleCron() {
        this.logger.log('Running daily QR code cleanup...');

        if (!fs.existsSync(this.qrDirectory)) {
            return;
        }

        fs.readdir(this.qrDirectory, (err, files) => {
            if (err) {
                this.logger.error(
                    `Unable to read QR directory: ${err.message}`,
                );
                return;
            }

            for (const file of files) {
                if (file.endsWith('.png')) {
                    fs.unlink(path.join(this.qrDirectory, file), (err) => {
                        if (err) {
                            this.logger.error(
                                `Failed to delete QR code file ${file}: ${err.message}`,
                            );
                        }
                    });
                }
            }
            this.logger.log(`Cleaned up ${files.length} QR code files.`);
        });
    }
}

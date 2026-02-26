import { Module, forwardRef } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { AuthModule } from '../auth/auth.module';

import { RedisModule } from '../../common/redis/redis.module';
import { QrManagerService } from './services/qr-manager.service';
import { QrCleanupService } from './services/qr-cleanup.service';

@Module({
    imports: [forwardRef(() => AuthModule), RedisModule],
    providers: [AttendancesService, QrManagerService, QrCleanupService],
    controllers: [AttendancesController],
    exports: [AttendancesService],
})
export class AttendancesModule {}

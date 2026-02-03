import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { AuthModule } from '../auth/auth.module';

import { RedisModule } from '../../common/redis/redis.module';
import { QrManagerService } from './services/qr-manager.service';

@Module({
    imports: [AuthModule, RedisModule],
    providers: [AttendancesService, QrManagerService],
    controllers: [AttendancesController],
})
export class AttendancesModule {}

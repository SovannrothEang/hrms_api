import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    providers: [AttendancesService],
    controllers: [AttendancesController],
})
export class AttendancesModule {}

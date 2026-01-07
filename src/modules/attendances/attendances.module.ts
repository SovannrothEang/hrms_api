import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';

@Module({
  providers: [AttendancesService],
  controllers: [AttendancesController]
})
export class AttendancesModule {}

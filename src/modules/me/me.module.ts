import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { LeavesModule } from '../leaves/leaves.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { PayrollsModule } from '../payroll/payrolls/payrolls.module';

@Module({
    imports: [LeavesModule, AttendancesModule, PayrollsModule],
    controllers: [MeController],
})
export class MeModule {}

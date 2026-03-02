import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { LeavesModule } from '../leaves/leaves.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { PayrollsModule } from '../payroll/payrolls/payrolls.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
    imports: [LeavesModule, AttendancesModule, PayrollsModule, EmployeesModule],
    controllers: [MeController],
})
export class MeModule {}

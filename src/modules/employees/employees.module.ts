import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { LeaveBalancesModule } from '../leave-balances/leave-balances.module';

@Module({
    imports: [LeaveBalancesModule],
    providers: [EmployeesService],
    exports: [EmployeesService],
    controllers: [EmployeesController],
})
export class EmployeesModule {}

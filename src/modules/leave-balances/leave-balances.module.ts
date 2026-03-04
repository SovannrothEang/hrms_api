import { Module } from '@nestjs/common';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveBalancesController } from './leave-balances.controller';

@Module({
    providers: [LeaveBalancesService],
    controllers: [LeaveBalancesController],
    exports: [LeaveBalancesService],
})
export class LeaveBalancesModule {}

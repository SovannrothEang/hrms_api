import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/services/prisma/prisma.module';
import { PayrollsController } from './payrolls.controller';
import { PayrollsService } from './payrolls.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
    imports: [PrismaModule, ExchangeRatesModule],
    controllers: [PayrollsController],
    providers: [PayrollsService],
    exports: [PayrollsService],
})
export class PayrollsModule {}

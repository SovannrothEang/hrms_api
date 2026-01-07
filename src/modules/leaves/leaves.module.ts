import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    providers: [LeavesService],
    controllers: [LeavesController],
})
export class LeavesModule { }

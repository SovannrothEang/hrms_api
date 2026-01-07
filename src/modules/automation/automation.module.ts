import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationService } from './automation.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [AutomationService],
})
export class AutomationModule { }

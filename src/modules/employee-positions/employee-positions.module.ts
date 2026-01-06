import { Module } from '@nestjs/common';
import { EmployeePositionsService } from './employee-positions.service';
import { EmployeePositionsController } from './employee-positions.controller';

@Module({
    providers: [EmployeePositionsService],
    controllers: [EmployeePositionsController],
})
export class EmployeePositionsModule {}

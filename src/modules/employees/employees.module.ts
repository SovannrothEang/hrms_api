import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
    providers: [EmployeesService],
    exports: [EmployeesService],
    controllers: [EmployeesController],
})
export class EmployeesModule {}

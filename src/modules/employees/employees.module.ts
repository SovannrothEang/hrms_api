import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { FileStorageModule } from '../../common/services/file-storage/file-storage.module';

@Module({
    imports: [FileStorageModule],
    providers: [EmployeesService],
    exports: [EmployeesService],
    controllers: [EmployeesController],
})
export class EmployeesModule {}

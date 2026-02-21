import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FileStorageModule } from 'src/common/services/file-storage/file-storage.module';

@Module({
    imports: [FileStorageModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}

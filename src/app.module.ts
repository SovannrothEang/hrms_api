import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/roles/roles.module';
@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }), // blocked by npm install error
    PrismaModule,
    UsersModule,
    AuthModule,
    EmployeesModule,
    RolesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/roles/roles.module';
import { UserContextService } from './utils/user-context.service';
import { ContextMiddleware } from './common/context.middleware';
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
  providers: [UserContextService],
  exports: [UserContextService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}

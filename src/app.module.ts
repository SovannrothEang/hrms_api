import { MiddlewareConsumer, Module } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/roles/roles.module';
import { EmployeePositionsModule } from './modules/employee-positions/employee-positions.module';
import { UserContextService } from './modules/auth/user-context.service';
import { ContextMiddleware } from './common/context.middleware';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { LeavesModule } from './modules/leaves/leaves.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',

          // Automatically reads X-Request-ID header or generates a new UUID
          genReqId: (req, res) => {
            const existingID = req.headers['x-request-id'];
            if (existingID) return existingID;
            const id = uuidv4();
            res.setHeader('X-Request-ID', id);
            return id;
          },

          redact: {
            paths: ['req.headers.authorization', 'res.headers.password'],
            remove: true,
          },
          transport: process.env.NODE_ENV !== 'production'
            ? {
              target: 'pino-pretty',
              options: {
                singleLine: true
              }
            }
            : undefined,
          autoLogging: true,

          // Simplify the request object in logs to avoid huge JSON blobs
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              query: req.query,
              params: req.params,
            }),
          },
        }
      })
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    EmployeesModule,
    RolesModule,
    EmployeePositionsModule,
    AttendancesModule,
    LeavesModule,
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

import { MiddlewareConsumer, Module } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/services/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { UsersModule } from './modules/iam/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/iam/roles/roles.module';
import { EmployeePositionsModule } from './modules/employee-positions/employee-positions.module';
import { UserContextService } from './modules/auth/user-context.service';
import { ContextMiddleware } from './common/context.middleware';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { PublicHolidaysModule } from './modules/public-holidays/public-holidays.module';
import { CurrenciesModule } from './modules/payroll/currencies/currencies.module';
import { TaxBracketsModule } from './modules/payroll/tax-brackets/tax-brackets.module';
import { PayrollsModule } from './modules/payroll/payrolls/payrolls.module';
import { DepartmentsModule } from './modules/departments/departments.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 1 minute
                limit: 10, // 10 requests per minute
            },
        ]),
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: () => ({
                pinoHttp: {
                    level:
                        process.env.NODE_ENV !== 'production'
                            ? 'debug'
                            : 'info',

                    // Automatically reads X-Request-ID header or generates a new UUID
                    genReqId: (req, res) => {
                        const existingID = req.headers['x-request-id'];
                        if (existingID) return existingID;
                        const id = uuidv4();
                        res.setHeader('X-Request-ID', id);
                        return id;
                    },

                    redact: {
                        paths: [
                            'req.headers.authorization',
                            'res.headers.password',
                        ],
                        remove: true,
                    },
                    transport:
                        process.env.NODE_ENV !== 'production'
                            ? {
                                  target: 'pino-pretty',
                                  options: {
                                      singleLine: true,
                                  },
                              }
                            : undefined,
                    autoLogging: true,

                    // Simplify the request object in logs to avoid huge JSON blobs
                    serializers: {
                        req: (req: {
                            id?: string;
                            method?: string;
                            url?: string;
                            query?: unknown;
                            params?: unknown;
                        }) => ({
                            id: req.id,
                            method: req.method,
                            url: req.url,
                            query: req.query,
                            params: req.params,
                        }),
                    },
                },
            }),
        }),
        AttendancesModule,
        AuthModule,
        AutomationModule,
        CurrenciesModule,
        DepartmentsModule,
        EmployeePositionsModule,
        EmployeesModule,
        LeavesModule,
        NotificationsModule,
        PayrollsModule,
        PrismaModule,
        PublicHolidaysModule,
        ReportsModule,
        RolesModule,
        SecurityModule,
        ShiftsModule,
        TaxBracketsModule,
        UsersModule,
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

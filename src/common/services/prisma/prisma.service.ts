import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

const softDeleteModels: readonly string[] = [
    'User',
    'Employee',
    'Department',
    'Payroll',
    'Role',
    'EmployeePosition',
    'Shift',
    'PublicHoliday',
    'Attendance',
    'LeaveRequest',
    'LeaveBalance',
    'Currency',
    'ExchangeRate',
    'PayrollItems',
    'TaxBracket',
    'EmployeeTaxConfig',
    'TaxCalculation',
    'Notification',
];

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    private _extendedClient: PrismaClient;

    constructor(private configService: ConfigService) {
        const connectionString =
            configService.get<string>('DATABASE_URL') || '';
        const pool = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
            keepAlive: true,
            ssl: connectionString.includes('render.com')
                ? { rejectUnauthorized: false }
                : false,
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });

        pool.on('connect', () => {
            console.log('New client connected to the pool');
        });

        pool.on('acquire', () => {
            // console.log('Client acquired from pool');
        });

        const adapter = new PrismaPg(pool);
        super({ adapter });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }

    get client(): PrismaClient {
        if (!this._extendedClient) {
            this._extendedClient = this.$extends({
                query: {
                    $allModels: {
                        async delete({ model, args, query }) {
                            if (softDeleteModels.includes(model)) {
                                const modelKey =
                                    model.charAt(0).toLowerCase() +
                                    model.slice(1);
                                const extended = this as unknown as {
                                    [key: string]: {
                                        update: (
                                            args: Record<string, unknown>,
                                        ) => Promise<unknown>;
                                    };
                                };
                                return (
                                    extended[modelKey]?.update({
                                        ...args,
                                        data: {
                                            isDeleted: true,
                                            deletedAt: new Date(),
                                        },
                                    }) ?? query(args)
                                );
                            }
                            return query(args);
                        },
                        async deleteMany({ model, args, query }) {
                            if (softDeleteModels.includes(model)) {
                                const modelKey =
                                    model.charAt(0).toLowerCase() +
                                    model.slice(1);
                                const extended = this as unknown as {
                                    [key: string]: {
                                        updateMany: (
                                            args: Record<string, unknown>,
                                        ) => Promise<unknown>;
                                    };
                                };
                                return (
                                    extended[modelKey]?.updateMany({
                                        ...args,
                                        data: {
                                            isDeleted: true,
                                            deletedAt: new Date(),
                                        },
                                    }) ?? query(args)
                                );
                            }
                            return query(args);
                        },
                        async findMany({ model, args, query }) {
                            if (softDeleteModels.includes(model)) {
                                const newArgs = { ...args } as Record<
                                    string,
                                    unknown
                                >;
                                newArgs.where = {
                                    isDeleted: false,
                                    ...(newArgs.where as object),
                                };
                                return query(
                                    newArgs as Parameters<typeof query>[0],
                                );
                            }
                            return query(args);
                        },
                        async findFirst({ model, args, query }) {
                            if (softDeleteModels.includes(model)) {
                                const newArgs = { ...args } as Record<
                                    string,
                                    unknown
                                >;
                                newArgs.where = {
                                    isDeleted: false,
                                    ...(newArgs.where as object),
                                };
                                return query(
                                    newArgs as Parameters<typeof query>[0],
                                );
                            }
                            return query(args);
                        },
                    async findUnique({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            const newArgs = { ...args } as Record<
                                string,
                                unknown
                            >;
                            newArgs.where = {
                                isDeleted: false,
                                ...(newArgs.where as object),
                            };
                            return query(
                                newArgs as Parameters<typeof query>[0],
                            );
                        }
                        return query(args);
                    },
                    async count({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            const newArgs = { ...args } as Record<
                                string,
                                unknown
                            >;
                            newArgs.where = {
                                isDeleted: false,
                                ...(newArgs.where as object),
                            };
                            return query(
                                newArgs as Parameters<typeof query>[0],
                            );
                        }
                        return query(args);
                    },
                    async groupBy({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            const newArgs = { ...args } as Record<
                                string,
                                unknown
                            >;
                            newArgs.where = {
                                isDeleted: false,
                                ...(newArgs.where as object),
                            };
                            return query(
                                newArgs as Parameters<typeof query>[0],
                            );
                        }
                        return query(args);
                    },
                    async aggregate({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            const newArgs = { ...args } as Record<
                                string,
                                unknown
                            >;
                            newArgs.where = {
                                isDeleted: false,
                                ...(newArgs.where as object),
                            };
                            return query(
                                newArgs as Parameters<typeof query>[0],
                            );
                        }
                        return query(args);
                    },
                },
            },
        }) as unknown as PrismaClient;

        }
        return this._extendedClient;
    }
}

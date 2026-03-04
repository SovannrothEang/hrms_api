import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
    constructor() {
        const connectionString = process.env.DATABASE_URL || '';
        const pool = new Pool({ connectionString });
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
        return this.$extends({
            query: {
                $allModels: {
                    async delete({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            const modelKey =
                                model.charAt(0).toLowerCase() + model.slice(1);
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
                                model.charAt(0).toLowerCase() + model.slice(1);
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
                },
            },
        }) as unknown as PrismaClient;
    }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

interface SoftDeleteCapable {
    [model: string]: {
        delete: (args: any) => Promise<any>;
        deleteMany: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
        updateMany: (args: any) => Promise<any>;
        findFirst: (args: any) => Promise<any>;
        findMany: (args: any) => Promise<any>;
        findUnique: (args: any) => Promise<any>;
    };
}

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    private readonly _extendedClient: any;

    constructor() {
        const connectionString = process.env.DATABASE_URL || '';
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        super({ adapter });
        this._extendedClient = this.setupSoftDelete();
    }

    get client(): any {
        return this._extendedClient;
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }

    private setupSoftDelete(): any {
        const softDeleteModels: string[] = [
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
        ];

        return this.$extends({
            query: {
                $allModels: {
                    async delete({ model, args }) {
                        if (softDeleteModels.includes(model)) {
                            return (this as unknown as SoftDeleteCapable)[
                                model
                            ].update({
                                ...args,
                                data: {
                                    isDeleted: true,
                                    deletedAt: new Date(),
                                },
                            });
                        }
                        return (this as unknown as SoftDeleteCapable)[
                            model
                        ].delete(args);
                    },
                    async deleteMany({ model, args }) {
                        if (softDeleteModels.includes(model)) {
                            return (this as unknown as SoftDeleteCapable)[
                                model
                            ].updateMany({
                                ...args,
                                data: {
                                    isDeleted: true,
                                    deletedAt: new Date(),
                                },
                            });
                        }
                        return (this as unknown as SoftDeleteCapable)[
                            model
                        ].deleteMany(args);
                    },
                    async findMany({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            args.where = { isDeleted: false, ...args.where };
                        }
                        return query(args);
                    },
                    async findFirst({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            args.where = { isDeleted: false, ...args.where };
                        }
                        return query(args);
                    },
                    async findUnique({ model, args, query }) {
                        if (softDeleteModels.includes(model)) {
                            args.where = { isDeleted: false, ...args.where };
                        }
                        return query(args);
                    },
                },
            },
        });
    }
}

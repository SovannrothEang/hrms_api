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
    };
}

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    // This property will hold the logic-enriched client
    private readonly _extendedClient: unknown;

    constructor() {
        const connectionString = process.env.DATABASE_URL || '';
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        super({ adapter });
        this._extendedClient = this.setupSoftDelete();
    }

    get client() {
        return this._extendedClient;
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }

    private setupSoftDelete() {
        const softDeleteModels: string[] = [
            'User',
            'Employee',
            'Department',
            'Payroll',
        ];

        return this.$extends({
            query: {
                $allModels: {
                    async delete({ model, args }) {
                        if (softDeleteModels.includes(model)) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return (this as unknown as SoftDeleteCapable)[
                            model
                        ].delete(args);
                    },
                    async deleteMany({ model, args }) {
                        if (softDeleteModels.includes(model)) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
                },
            },
        });
    }
}

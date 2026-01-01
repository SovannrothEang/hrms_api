import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // This property will hold the logic-enriched client
  private _extendedClient;

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
              return (this as any).update({
                ...args,
                data: { isDeleted: true, deletedAt: new Date() },
              });
            }
            return (this as any).delete(args);
          },
          async deleteMany({ model, args }) {
            if (softDeleteModels.includes(model)) {
              return (this as any).updateMany({
                ...args,
                data: { isDeleted: true, deletedAt: new Date() },
              });
            }
            return (this as any).deleteMany(args);
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

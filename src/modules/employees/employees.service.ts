import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import EmployeeCreateDto from './dtos/employee-create.dto';
import { Prisma } from '@prisma/client/extension';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async hireEmployees(dto: EmployeeCreateDto, hrUserId: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const employee = await tx.user.create({});
    });
  }
}

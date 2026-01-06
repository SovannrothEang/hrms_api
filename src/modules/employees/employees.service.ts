import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
    constructor(private prisma: PrismaService) {}

    // async onboardinngEmployee(dto: EmployeeCreateDto, hrUserId: string) {
    //   return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    //     const employee = await tx.user.create({
    //       data: {
    //         email: dto.email,
    //         username: dto.username,
    //         password: dto.password,
    //         userRoles: {
    //           create: {
    //             roleId: dto.roleId,
    //             performBy: hrUserId,
    //           },
    //         },
    //       },
    //     });
    //   });
    // }
}

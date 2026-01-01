import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.role.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.role.findUnique({
      where: { id },
    });
  }

  async createAsync(roleName: string) {
    return await this.prisma.role.create({
      data: {
        name: roleName.toLowerCase(),
      },
    });
  }
}

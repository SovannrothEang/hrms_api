import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleDto } from './dtos/roles.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany();
    return roles.map((e) => plainToInstance(RoleDto, e));
  }

  async findOne(id: string): Promise<RoleDto | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });
    return role === null ? null : plainToInstance(RoleDto, role);
  }

  async createAsync(roleName: string, userId: string): Promise<RoleDto> {
    const role = await this.prisma.role.create({
      data: {
        name: roleName.toLowerCase(),
        performer: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return plainToInstance(RoleDto, role);
  }

  async updateAsync(id: string, roleName: string, userId: string) {
    await this.prisma.role.update({
      where: { id },
      data: {
        name: roleName,
        performer: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  // Soft delete
  async deleteAsync(id: string, userId: string) {
    await this.prisma.role.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        performer: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
}

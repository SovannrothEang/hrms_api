import { Injectable } from '@nestjs/common';
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

  async findOne(id: string): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });
    return plainToInstance(RoleDto, role);
  }

  async createAsync(roleName: string): Promise<RoleDto> {
    const role = await this.prisma.role.create({
      data: {
        name: roleName.toLowerCase(),
      },
    });
    return plainToInstance(RoleDto, role);
  }

  async updateAsync();
}

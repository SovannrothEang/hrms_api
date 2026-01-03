import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return users.map((u) => plainToInstance(UserDto, u));
  }

  async findOne(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
        isDeleted: false,
      },
    });
  }

  async create(dto: UserCreateDto): Promise<UserDto> {
    const role = await this.prisma.role.findUnique({ where: { name: 'user' } });
    if (!role) {
      throw new BadRequestException('Roles do not match or exist!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return plainToInstance(UserDto, user);
  }
}

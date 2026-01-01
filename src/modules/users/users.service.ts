import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import EmployeeCreateDto from '../employees/dtos/employee-create.dto';
import CreateUserDto from './dtos/user-create.dto';
import UserCreateDto from './dtos/user-create.dto';
import { Prisma, User } from '../../../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async create(dto: UserCreateDto): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user: User = await tx.user.create({
        data: {
          email: dto.Email,
          username: dto.UserName,
          passwordhash: dto.Password,
        },
      });
      return user;
    });
  }
}

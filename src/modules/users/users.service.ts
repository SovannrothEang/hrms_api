import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import * as bcrypt from 'bcrypt';
import { UserUpdateDto } from './dtos/user-update.dto';
import { Result } from 'src/common/logic/result';
import { RoleName } from 'src/common/enums/roles.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) { }

  async findAllAsync() {
    this.logger.log('Getting all users');
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

  async findOneAsync(userId: string): Promise<Result<UserDto>> {
    this.logger.log('Getting user with {id}.', userId);
    const user = this.prisma.user.findFirst({ where: { id: userId, }, });
    if (!user) {
      this.logger.warn('User not found!');
      return Result.fail('User not found!');
    }

    return Result.ok(plainToInstance(UserDto, user));
  }

  async isExistAsync(username?: string, email?: string): Promise<boolean> {
    const conditions: Prisma.UserWhereInput[] = [];

    if (username) {
      this.logger.log('Checking username with {username}.', username);
      conditions.push({ username });
    }
    if (email) {
      this.logger.log('Checking email with {email}.', email);
      conditions.push({ email });
    }

    if (conditions.length <= 0) {
      this.logger.warn('No conditions provided!');
      return false;
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: conditions, },
      select: { id: true, },
    });
    return user !== null;
  }

  async createAsync(dto: UserCreateDto, userId?: string): Promise<Result<UserDto>> {
    this.logger.log('Creating user with {username} and {email}.', dto.username, dto.email);
    const role = await this.prisma.role.findUnique({ where: { name: RoleName.EMPLOYEE } });
    if (!role) {
      this.logger.warn('Role not found!');
      return Result.fail('Roles do not match or exist!');
    }

    const existingUser = await this.isExistAsync(dto.username, dto.email);
    if (existingUser) {
      this.logger.warn('User already exists!');
      return Result.fail('Username or Email already exists!');
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
            performBy: userId
          },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    return Result.ok(plainToInstance(UserDto, user));
  }

  async updateAsync(id: string, dto: UserUpdateDto): Promise<void> {
    this.logger.log('Update user with id: {id}.', id);
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: { id: true }
    });
    if (!user) {
      this.logger.warn('User not found!');
      throw new NotFoundException('User not found!');
    }

    const existingUser = await this.isExistAsync(dto.username, dto.email);
    if (existingUser) {
      this.logger.warn('User already exists!');
      throw new BadRequestException('Username or Email already exists!');
    }

    await this.prisma.user.update({
      where: { id, isDeleted: false },
      data: {
        email: dto.email,
        username: dto.username,
      },
    });
  }

  async deleteAsync(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: { id: true }
    });
    if (!user) {
      throw new NotFoundException('User not found!');
    }

    await this.prisma.user.update({
      where: { id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDto } from '../users/dtos/user.dto';
import { RegisterDto } from './dtos/register.dto';
import { UserContextService } from '../../utils/user-context.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly userContext: UserContextService,
  ) {}

  async signInAsync(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Email or password is required');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials!');
    }

    const roles = user.userRoles.map((e) => e.role.name);
    if (roles.length <= 0)
      throw new UnauthorizedException('Roles do not match!');

    const payloads = { sub: user.id, email: user.email, roles: roles };
    return {
      access_token: this.jwtService.sign(payloads),
    };
  }

  async registerAsync(dto: RegisterDto): Promise<UserDto> {
    const isEmailExist = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (isEmailExist) {
      throw new ConflictException('Credentials is already registered!');
    }

    const isUserNameExist = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (isUserNameExist) {
      throw new ConflictException('Credentials is already registered!');
    }

    if (dto.password !== dto.confirmPassword)
      throw new BadRequestException('Passwords do not match!');

    return await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });
  }

  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }

  getMe() {
    const currentUser = this.userContext.getUser();
    return currentUser;
  }
}

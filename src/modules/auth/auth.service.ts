import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

  async registerAsync(username: string, email: string, password: string) {
    const isEmailExist = await this.prisma.user.findFirst({ where: { email } });
    if (isEmailExist) {
      throw new ConflictException('Credentials is already registered!');
    }

    const isUserNameExist = await this.prisma.user.findFirst({
      where: { username },
    });
    if (isUserNameExist) {
      throw new ConflictException('Credentials is already registered!');
    }

    const role = await this.prisma.role.findUnique({ where: { name: 'user' } });
    if (!role) {
      throw new BadRequestException('Roles do not match or exist!');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: {
        email,
        username,
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
  }
}

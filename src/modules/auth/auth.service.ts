import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDto } from '../users/dtos/user.dto';
import { RegisterDto } from './dtos/register.dto';
import { UserContextService } from './user-context.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly userContext: UserContextService,
  ) { }

  async signInAsync(email: string, password: string) {
    this.logger.log('Signing in user with {email}.', email);

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
      this.logger.warn('User not found!');
      throw new UnauthorizedException('Email or password is required');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn('Invalid credentials!');
      throw new UnauthorizedException('Invalid credentials!');
    }

    const roles = user.userRoles.map((e) => e.role.name);
    if (roles.length <= 0) {
      this.logger.warn('User has no roles!');
      throw new UnauthorizedException('Roles do not match!');
    }

    const payloads = { sub: user.id, email: user.email, roles: roles };
    return {
      access_token: this.jwtService.sign(payloads),
    };
  }

  async registerAsync(dto: RegisterDto): Promise<UserDto> {
    this.logger.log('Registering user with {email}.', dto.email);

    const isEmailExist = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (isEmailExist) {
      this.logger.warn('Email already exists!');
      throw new ConflictException('Credentials is already registered!');
    }

    const isUserNameExist = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (isUserNameExist) {
      this.logger.warn('Username already exists!');
      throw new ConflictException('Credentials is already registered!');
    }

    if (dto.password !== dto.confirmPassword) {
      this.logger.warn('Passwords do not match!');
      throw new BadRequestException('Passwords do not match!');
    }

    return await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });
  }

  validateToken(token: string) {
    this.logger.log('Validating token with {token}.', token);

    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn('Invalid token!');
      throw new UnauthorizedException(error);
    }
  }

  getMe() {
    this.logger.log('Getting current user');
    const currentUser = this.userContext.getUser();
    return currentUser;
  }
}

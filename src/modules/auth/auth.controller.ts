import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async signIn(@Body() loginDto: LoginDto) {
    return await this.authService.signInAsync(
      loginDto.email,
      loginDto.password,
    );
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.registerAsync(
      registerDto.username,
      registerDto.email,
      registerDto.password,
    );
  }
}

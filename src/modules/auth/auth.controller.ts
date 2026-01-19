import {
    Body,
    Controller,
    Get,
    Post,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Auth } from 'src/common/decorators/auth.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid credentials',
    })
    async signIn(@Body() loginDto: LoginDto) {
        var result = await this.authService.signInAsync(
            loginDto.email,
            loginDto.password,
        );
        return result.getData();
    }

    // @Post('register')
    // @ApiOperation({ summary: 'Register new user' })
    // @ApiResponse({ status: HttpStatus.CREATED, description: 'User successfully registered' })
    // @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request (e.g., email already exists)' })
    // async register(@Body() registerDto: RegisterDto) {
    //   const result = await this.authService.registerAsync(registerDto);
    //   if (!result.isSuccess) {
    //     throw new BadRequestException(result.error);
    //   }
    //   return result;
    // }

    @Get('me')
    @Auth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return current user details',
    })
    async getMe(@CurrentUser('sub') userId?: string) {
        if (!userId)
            throw new UnauthorizedException('User is not authenticated!');
        const result = await this.authService.getMe(userId);
        if (!result.isSuccess)
            throw new UnauthorizedException('User is not authenticated!'); // TODO: Maybe Im the one who wrong
        return result.getData();
    }
}

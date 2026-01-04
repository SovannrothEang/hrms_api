import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserUpdateDto } from './dtos/user-update.dto';

@Controller('users')
@Auth(RoleName.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of users dto' })
  async findAll() {
    return await this.usersService.findAllAsync();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User dto' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOneAsync(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: HttpStatus.CREATED, type: UserDto, description: 'Create user' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
  async create(@Body() dto: UserCreateDto, @CurrentUser('sub') userId: string) {
    const result = await this.usersService.createAsync(dto, userId);
    if (!result.isSuccess) {
      throw new BadRequestException(result.error);
    }
    return result;
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update user by id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async update(@Param('id') id: string, @Body() dto: UserUpdateDto) {
    await this.usersService.updateAsync(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async delete(@Param('id') id: string) {
    await this.usersService.deleteAsync(id);
  }
}

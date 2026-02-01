import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserUpdateDto } from './dtos/user-update.dto';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';

@Controller('users')
@Auth(RoleName.ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all users (Paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of users' })
    async findAll(@Query() pagination: PaginationDto): Promise<ResultPagination<UserDto>> {
        return await this.usersService.findAllPaginatedAsync(
            pagination.page || 1,
            pagination.limit || 10,
        );
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user by id' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'User dto' })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async findOne(@Param('id') id: string) {
        return await this.usersService.findOneByIdAsync(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create user' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        type: UserDto,
        description: 'Create user',
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async create(
        @Body() dto: UserCreateDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.usersService.createAsync(dto, userId);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result;
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update user by id' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User updated' })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async update(@Param('id') id: string, @Body() dto: UserUpdateDto) {
        await this.usersService.updateAsync(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete user by id' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User deleted' })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async delete(@Param('id') id: string) {
        await this.usersService.deleteAsync(id);
    }
}

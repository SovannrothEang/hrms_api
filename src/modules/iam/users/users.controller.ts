import {
    BadRequestException,
    NotFoundException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
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
import { UserQueryDto } from './dtos/user-query.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';

@Controller('users')
@Auth(RoleName.ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all users (paginated with filters)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({
        name: 'role',
        required: false,
        enum: RoleName,
    })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'createdAtFrom', required: false, type: String })
    @ApiQuery({ name: 'createdAtTo', required: false, type: String })
    @ApiQuery({
        name: 'sortBy',
        required: false,
        enum: ['username', 'email', 'createdAt', 'updatedAt'],
    })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Paginated list of users',
    })
    async findAll(
        @Query() query: UserQueryDto,
    ): Promise<ResultPagination<UserDto>> {
        const result = await this.usersService.findAllFilteredAsync(query);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
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
    async findOne(@Param('id') id: string): Promise<UserDto> {
        const result = await this.usersService.findOneByIdAsync(id);
        if (!result.isSuccess) {
            throw new NotFoundException(result.error);
        }
        return result.getData();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create user' })
    @ApiQuery({
        name: 'role',
        required: false,
        enum: RoleName,
        description: 'Role to assign to the user (default: ADMIN)',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        type: UserDto,
        description: 'Create user',
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
    async create(
        @Body() dto: UserCreateDto,
        @CurrentUser('sub') userId: string,
        @Query('role') role?: RoleName,
    ) {
        const result = await this.usersService.createAsync(dto, userId, role);
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
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
    async update(
        @Param('id') id: string,
        @Body() dto: UserUpdateDto,
        @CurrentUser('sub') userId: string,
    ) {
        await this.usersService.updateAsync(id, dto, userId);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Partially update user by id' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User updated' })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async patch(
        @Param('id') id: string,
        @Body() dto: UserUpdateDto,
        @CurrentUser('sub') userId: string,
    ) {
        await this.usersService.updateAsync(id, dto, userId);
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

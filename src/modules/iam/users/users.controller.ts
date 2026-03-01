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
    UploadedFile,
    UseInterceptors,
    Res,
} from '@nestjs/common';
import * as fs from 'fs';
import { UsersService } from './users.service';
import {
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { UserDto } from './dtos/user.dto';
import UserCreateDto from './dtos/user-create.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserUpdateDto } from './dtos/user-update.dto';
import { UserQueryDto } from './dtos/user-query.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { FileInterceptor } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';

@Controller('users')
@Auth()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user summary statistics' })
    @ApiResponse({ status: HttpStatus.OK })
    @Auth(RoleName.ADMIN)
    async getSummary() {
        return await this.usersService.getSummaryAsync();
    }

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
    @Auth(RoleName.ADMIN)
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
    @Auth(RoleName.ADMIN)
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
    @Auth(RoleName.ADMIN)
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
    @Auth(RoleName.ADMIN)
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
    @Auth(RoleName.ADMIN)
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
    @Auth(RoleName.ADMIN)
    async delete(@Param('id') id: string) {
        await this.usersService.deleteAsync(id);
    }

    @Get(':id/image')
    @Auth()
    @ApiOperation({ summary: 'Get user profile image file' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    async getImage(@Param('id') id: string, @Res() res: express.Response) {
        const result = await this.usersService.findOneByIdAsync(id);
        if (!result.isSuccess) throw new NotFoundException(result.error);

        const user = result.getData();
        if (!user.profileImage) {
            throw new NotFoundException('Profile image not found');
        }

        const filePath = join(process.cwd(), 'public', user.profileImage);
        return res.sendFile(filePath);
    }

    @Post(':id/image')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @Auth()
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload user profile image' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Image uploaded' })
    async uploadImage(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.usersService.uploadImageAsync(
            id,
            file,
            performerId,
        );
        if (!result.isSuccess) throw new BadRequestException(result.error);
        return { imagePath: result.getData() };
    }

    @Delete(':id/image')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete user image by id' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'User image deleted',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async deleteImage(
        @Param('id') id: string,
        @CurrentUser('sub') performerId: string,
    ) {
        const result = await this.usersService.removeImageAsync(
            id,
            performerId,
        );
        if (!result.isSuccess) throw new BadRequestException(result.error);
    }
}

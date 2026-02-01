import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseBoolPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleCreateDto } from './dtos/role-create.dto';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleUpdateDto } from './dtos/role-update.dto';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResultPagination } from 'src/common/logic/result-pagination';
import { RoleDto } from './dtos/roles.dto';

@Controller('roles')
@ApiTags('Roles')
@Auth(RoleName.ADMIN)
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all roles (Paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'childIncluded', required: false, type: Boolean })
    @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of roles' })
    async findAll(
        @Query() pagination: PaginationDto,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ): Promise<ResultPagination<RoleDto>> {
        return await this.rolesService.findAllPaginatedAsync(
            pagination.page || 1,
            pagination.limit || 10,
            childIncluded,
        );
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get a role by id' })
    @ApiParam({ name: 'id', required: true, description: 'Role ID' })
    @ApiQuery({ name: 'childIncluded', required: false })
    @ApiResponse({ status: HttpStatus.OK, description: 'Get a role by id' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
    async findOne(
        @Param('id') id: string,
        @Query('childIncluded', new ParseBoolPipe({ optional: true }))
        childIncluded?: boolean,
    ) {
        const result = await this.rolesService.findOneByIdAsync(
            id,
            childIncluded,
        );
        if (!result.isSuccess) {
            throw new NotFoundException(result.error);
        }
        return result.getData();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Create a new role',
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    async create(
        @Body() dto: RoleCreateDto,
        @CurrentUser('sub') userId: string,
    ) {
        const result = await this.rolesService.createAsync(
            dto.roleName,
            userId,
        );
        if (!result.isSuccess) {
            throw new BadRequestException(result.error);
        }
        return result.getData();
    }

    @Put(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update a role' })
    @ApiParam({ name: 'id', required: true, description: 'Role ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
    async update(
        @Param('id') id: string,
        @Body() dto: RoleUpdateDto,
        @CurrentUser('sub') userId: string,
    ) {
        await this.rolesService.updateAsync(id, dto.name, userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a role' })
    @ApiParam({ name: 'id', required: true, description: 'Role ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
    async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        await this.rolesService.deleteAsync(id, userId);
    }
}

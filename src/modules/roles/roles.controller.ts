import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleCreateDto } from './dtos/role-create.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleUpdateDto } from './dtos/role-update.dto';

@Controller('roles')
@ApiTags('Roles')
@Auth(RoleName.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Get all roles' })
  async findAll() {
    return await this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role id' })
  @ApiResponse({ status: 200, description: 'Get a role id' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    if (!role) {
      throw new NotFoundException();
    }
    return role;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Create a new role' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async create(@Body() dto: RoleCreateDto, @CurrentUser('sub') userId: string) {
    return this.rolesService.createAsync(dto.roleName, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 204, description: 'No Content' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async update(
    @Param('id') id: string,
    @Body() dto: RoleUpdateDto,
    @CurrentUser('sub') userId: string,
  ) {
    await this.rolesService.updateAsync(id, dto.name, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 204, description: 'No Content' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    await this.rolesService.deleteAsync(id, userId);
  }
}

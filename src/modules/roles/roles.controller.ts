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
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RoleUpdateDto } from './dtos/role-update.dto';

@Controller('roles')
@ApiTags('Roles')
@Auth(RoleName.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({ name: 'childIncluded', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Get all roles' })
  async findAll(@Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean) {
    return await this.rolesService.findAllAsync(childIncluded);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a role id' })
  @ApiQuery({ name: 'childIncluded', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Get a role id' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  async findOne(@Param('id') id: string, @Query('childIncluded', new ParseBoolPipe({ optional: true })) childIncluded?: boolean) {
    const role = await this.rolesService.findOneAsync(id, childIncluded);
    if (!role) {
      throw new NotFoundException(`Role not found with id: ${id}`);
    }
    return role;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Create a new role' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  async create(@Body() dto: RoleCreateDto, @CurrentUser('sub') userId: string) {
    const result = await this.rolesService.createAsync(dto.roleName, userId);
    if (!result.isSuccess) {
      throw new BadRequestException(result.error);
    }
    return result;
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a role' })
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
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No Content' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not Found' })
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    await this.rolesService.deleteAsync(id, userId);
  }
}

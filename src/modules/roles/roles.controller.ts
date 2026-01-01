import { Body, Controller, Get, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleCreateDto } from './dtos/role-create.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    return await this.rolesService.findAll();
  }

  @Post()
  async create(@Body() dto: RoleCreateDto) {
    return this.rolesService.createAsync(dto.roleName);
  }
}

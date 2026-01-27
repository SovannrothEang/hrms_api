import {
    Controller,
    Get,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dtos/audit-log-query.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RoleName } from 'src/common/enums/roles.enum';

@Controller('audit-logs')
@ApiTags('Audit Logs')
@Auth(RoleName.ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all audit logs (Paginated)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns paginated audit logs',
    })
    async findAll(@Query() query: AuditLogQueryDto) {
        return await this.auditLogsService.findAllPaginatedAsync(query);
    }

    @Get('actions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get distinct action types' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns list of distinct actions',
    })
    async getDistinctActions() {
        return await this.auditLogsService.getDistinctActionsAsync();
    }

    @Get('tables')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get distinct table names' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns list of distinct table names',
    })
    async getDistinctTables() {
        return await this.auditLogsService.getDistinctTablesAsync();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get audit log by ID' })
    @ApiParam({ name: 'id', required: true, description: 'Audit log ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns audit log details',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Audit log not found',
    })
    async findOne(@Param('id') id: string) {
        const result = await this.auditLogsService.findByIdAsync(id);
        if (!result) {
            throw new NotFoundException('Audit log not found');
        }
        return result;
    }
}

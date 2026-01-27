import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogUserDto {
    @ApiProperty({ example: 'user-uuid-123' })
    id: string;

    @ApiProperty({ example: 'john.doe@company.com' })
    email: string;

    @ApiPropertyOptional({ example: 'John' })
    firstname?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    lastname?: string;
}

export class AuditLogDto {
    @ApiProperty({ example: 'log-uuid-123' })
    id: string;

    @ApiPropertyOptional({ example: 'user-uuid-123' })
    userId?: string;

    @ApiProperty({ example: 'CREATE' })
    action: string;

    @ApiProperty({ example: 'employees' })
    tableName: string;

    @ApiProperty({ example: 'record-uuid-123' })
    recordId: string;

    @ApiPropertyOptional({ example: { status: 'ACTIVE' } })
    oldValue?: Record<string, unknown>;

    @ApiPropertyOptional({ example: { status: 'INACTIVE' } })
    newValue?: Record<string, unknown>;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    timestamp: Date;

    @ApiPropertyOptional({ type: AuditLogUserDto })
    user?: AuditLogUserDto;
}

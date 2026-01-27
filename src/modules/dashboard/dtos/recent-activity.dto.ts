import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecentActivityDto {
    @ApiProperty({ example: 'activity-uuid-123', description: 'Activity ID' })
    id: string;

    @ApiProperty({ example: 'CREATE', description: 'Action type' })
    action: string;

    @ApiProperty({ example: 'employees', description: 'Entity type' })
    entityType: string;

    @ApiProperty({ example: 'entity-uuid-123', description: 'Entity ID' })
    entityId: string;

    @ApiPropertyOptional({
        example: 'John Doe',
        description: 'User who performed the action',
    })
    performedBy?: string;

    @ApiPropertyOptional({
        example: 'user-uuid-123',
        description: 'User ID who performed the action',
    })
    userId?: string;

    @ApiProperty({
        example: '2024-01-15T10:30:00Z',
        description: 'Timestamp of the activity',
    })
    timestamp: Date;

    @ApiPropertyOptional({
        example: 'Created new employee record',
        description: 'Activity description',
    })
    description?: string;
}

export class RecentActivitiesDto {
    @ApiProperty({ type: [RecentActivityDto] })
    activities: RecentActivityDto[];

    @ApiProperty({ example: 10, description: 'Number of activities returned' })
    count: number;
}

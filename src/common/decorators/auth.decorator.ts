import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RoleName } from '../enums/roles.enum';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export function Auth(...roles: RoleName[]) {
    const decorators = [
        UseGuards(JwtAuthGuard, RolesGuard),
        ApiBearerAuth(),
        ApiResponse({ status: 401, description: 'Unauthorized' }),
    ];

    if (roles.length > 0) {
        decorators.push(Roles(...roles));
        decorators.push(ApiResponse({ status: 403, description: 'Forbidden' }));
    }

    return applyDecorators(...decorators);
}

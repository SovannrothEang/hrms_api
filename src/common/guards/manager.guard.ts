import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class ManagerGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub;

        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        const targetId = request.params.id;

        // Get the employee associated with the user
        const employee = await this.prisma.employee.findUnique({
            where: { userId },
        });

        if (!employee) {
            throw new ForbiddenException('Employee not found for user');
        }

        // Allow if user is ADMIN
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const roles = user.userRoles.map((ur) => ur.role.name);
        if (roles.includes('ADMIN')) {
            return true;
        }

        // Check if target is subordinate
        const targetEmployee = await this.prisma.employee.findUnique({
            where: { id: targetId },
            select: { managerId: true },
        });

        if (!targetEmployee) {
            throw new ForbiddenException('Target employee not found');
        }

        return targetEmployee.managerId === employee.id;
    }
}

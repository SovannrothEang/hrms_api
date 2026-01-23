import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class SelfGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub;

        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        const targetId = request.params.id;

        // Allow if user is accessing their own data
        if (userId === targetId) {
            return true;
        }

        // Check if user is ADMIN
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
        return roles.includes('ADMIN');
    }
}

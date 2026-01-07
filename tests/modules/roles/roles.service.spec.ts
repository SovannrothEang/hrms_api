import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '../../../src/modules/roles/roles.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';

const mockPrismaService = {
    role: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

describe('RolesService', () => {
    let service: RolesService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create role', async () => {
            const roleName = 'MANAGER';
            const created = { id: '1', name: 'MANAGER', isActive: true };

            (prisma.role.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.role.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(roleName, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe('MANAGER');
        });

        it('should fail if role exists', async () => {
            const roleName = 'MANAGER';
            (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

            const result = await service.createAsync(roleName, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Role already exists!');
        });
    });

    describe('findAllAsync', () => {
        it('should return roles', async () => {
            (prisma.role.findMany as jest.Mock).mockResolvedValue([{ id: '1', name: 'ADMIN' }]);
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });
});

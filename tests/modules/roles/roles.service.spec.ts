import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { RolesService } from 'src/modules/iam/roles/roles.service';

const mockPrismaClient = {
    role: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('RolesService', () => {
    let service: RolesService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
        prismaClient = mockPrismaClient;
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

            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaClient.role.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(roleName, 'user-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().name).toBe('MANAGER');
        });

        it('should fail if role exists', async () => {
            const roleName = 'MANAGER';
            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
            });

            const result = await service.createAsync(roleName, 'user-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Role already exists!');
        });
    });

    describe('findAllAsync', () => {
        it('should return roles', async () => {
            (prismaClient.role.findMany as jest.Mock).mockResolvedValue([
                { id: '1', name: 'ADMIN' },
            ]);
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });
});

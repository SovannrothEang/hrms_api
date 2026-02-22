import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../src/modules/iam/users/users.service';
import { FileStorageService } from '../../../src/common/services/file-storage/file-storage.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { RoleName } from '../../../src/common/enums/roles.enum';

const mockPrismaClient = {
    user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    role: {
        findFirst: jest.fn(),
        create: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('UsersService', () => {
    let service: UsersService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: FileStorageService, useValue: { saveFileAsync: jest.fn(), deleteFileAsync: jest.fn() } }
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAsync', () => {
        it('should create user', async () => {
            const dto = {
                username: 'john',
                email: 'john@example.com',
                password: 'password',
            };
            const created = {
                id: '1',
                ...dto,
                isDeleted: false,
                isActive: true,
            };

            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue({
                id: 'role-1',
            });
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null); // isExist check
            (prismaClient.user.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(dto, 'admin-id');
            expect(result.isSuccess).toBe(true);
            expect(result.getData().username).toBe('john');
        });

        it('should fail if user exists', async () => {
            const dto = {
                username: 'john',
                email: 'john@example.com',
                password: 'password',
            };
            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue({
                id: 'role-1',
            });
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
                id: '1',
            }); // isExist check

            const result = await service.createAsync(dto, 'admin-id');
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('Username or Email already exists!');
        });

        it('should create role if it does not exist', async () => {
            const dto = {
                username: 'john',
                email: 'john@example.com',
                password: 'password',
            };
            const created = {
                id: '1',
                ...dto,
                isDeleted: false,
                isActive: true,
            };

            (prismaClient.role.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaClient.role.create as jest.Mock).mockResolvedValue({
                id: 'new-role-id',
                name: 'CUSTOM_ROLE',
            });
            (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaClient.user.create as jest.Mock).mockResolvedValue(created);

            const result = await service.createAsync(
                dto,
                'admin-id',
                'custom_role',
            );

            expect(prismaClient.role.create).toHaveBeenCalledWith({
                data: {
                    name: 'CUSTOM_ROLE',
                    performBy: 'admin-id',
                },
            });
            expect(result.isSuccess).toBe(true);
        });
    });

    describe('findAllAsync', () => {
        it('should return users', async () => {
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue([
                { id: '1', username: 'john' },
            ]);
            const result = await service.findAllAsync();
            expect(result.isSuccess).toBe(true);
            expect(result.getData()).toHaveLength(1);
        });
    });

    describe('findAllPaginatedAsync', () => {
        const mockUsers = [
            {
                id: '1',
                username: 'admin',
                email: 'admin@example.com',
                userRoles: [{ role: { name: 'ADMIN' } }],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: '2',
                username: 'employee',
                email: 'employee@example.com',
                userRoles: [{ role: { name: 'EMPLOYEE' } }],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        it('should filter by role and pass correct where clause to Prisma', async () => {
            (prismaClient.user.count as jest.Mock).mockResolvedValue(1);
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue([
                mockUsers[0],
            ]);

            const query = { role: 'ADMIN', page: 1, limit: 10 };
            const result = await service.findAllPaginatedAsync(query as any);

            const expectedRoleFilter = {
                some: {
                    role: {
                        name: {
                            equals: 'ADMIN',
                            mode: 'insensitive',
                        },
                        isDeleted: false,
                        isActive: true,
                    },
                },
            };

            expect(prismaClient.user.count).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    isDeleted: false,
                    userRoles: expectedRoleFilter,
                }),
            });
            expect(prismaClient.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userRoles: expectedRoleFilter,
                    }),
                }),
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].username).toBe('admin');
        });

        it('should not add role filter when role is not provided', async () => {
            (prismaClient.user.count as jest.Mock).mockResolvedValue(2);
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue(
                mockUsers,
            );

            const query = { page: 1, limit: 10 };
            await service.findAllPaginatedAsync(query as any);

            const countCall = (prismaClient.user.count as jest.Mock).mock
                .calls[0][0];
            expect(countCall.where.userRoles).toBeUndefined();
        });

        it('should return paginated results with role filter', async () => {
            (prismaClient.user.count as jest.Mock).mockResolvedValue(1);
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue([
                mockUsers[1],
            ]);

            const query = { role: 'EMPLOYEE', page: 1, limit: 10 };
            const result = await service.findAllPaginatedAsync(query as any);

            expect(result.meta.total).toBe(1);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].roles).toContain('EMPLOYEE');
        });
    });

    describe('findAllFilteredAsync', () => {
        it('should return success result with role filter', async () => {
            (prismaClient.user.count as jest.Mock).mockResolvedValue(1);
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue([
                {
                    id: '1',
                    username: 'hr',
                    email: 'hr@example.com',
                    userRoles: [{ role: { name: 'HR' } }],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            const query = { role: 'HR', page: 1, limit: 10 };
            const result = await service.findAllFilteredAsync(query as any);

            expect(result.isSuccess).toBe(true);
            expect(result.getData().data).toHaveLength(1);
        });

        it('should handle errors gracefully', async () => {
            (prismaClient.user.count as jest.Mock).mockRejectedValue(
                new Error('DB error'),
            );

            const query = { role: 'ADMIN', page: 1, limit: 10 };
            const result = await service.findAllFilteredAsync(query as any);

            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe('DB error');
        });
    });
});

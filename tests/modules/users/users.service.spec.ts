import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../src/modules/iam/users/users.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { RoleName } from '../../../src/common/enums/roles.enum';

const mockPrismaClient = {
    user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    role: {
        findFirst: jest.fn(),
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
    });

    describe('findAllAsync', () => {
        it('should return users', async () => {
            (prismaClient.user.findMany as jest.Mock).mockResolvedValue([
                { id: '1', username: 'john' },
            ]);
            const result = await service.findAllAsync();
            expect(result).toHaveLength(1);
        });
    });
});

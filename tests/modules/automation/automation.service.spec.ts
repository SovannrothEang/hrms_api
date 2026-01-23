import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from '../../../src/modules/automation/automation.service';
import { PrismaService } from '../../../src/common/services/prisma/prisma.service';
import { AttendanceStatus } from '../../../src/common/enums/attendance-status.enum';

const mockPrismaClient = {
    attendance: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
    },
    employee: {
        findMany: jest.fn(),
    },
    leaveRequest: {
        findFirst: jest.fn(),
    },
};

const mockPrismaService = {
    client: mockPrismaClient,
};

describe('AutomationService', () => {
    let service: AutomationService;
    let prismaClient: typeof mockPrismaClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AutomationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AutomationService>(AutomationService);
        prismaClient = mockPrismaClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleAutoCheckout', () => {
        it('should auto-checkout users', async () => {
            (prismaClient.attendance.findMany as jest.Mock).mockResolvedValue([
                { id: '1' },
            ]);
            await service.handleAutoCheckout();
            expect(prismaClient.attendance.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: '1' },
                    data: expect.objectContaining({
                        status: AttendanceStatus.DID_NOT_CHECKOUT,
                    }),
                }),
            );
        });
    });

    describe('handleAbsentMarking', () => {
        it('should mark absent if no attendance and no leave', async () => {
            (prismaClient.employee.findMany as jest.Mock).mockResolvedValue([
                { id: 'emp-1' },
            ]);
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue(
                null,
            );
            (
                prismaClient.leaveRequest.findFirst as jest.Mock
            ).mockResolvedValue(null);

            await service.handleAbsentMarking();

            expect(prismaClient.attendance.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        employeeId: 'emp-1',
                        status: AttendanceStatus.ABSENT,
                    }),
                }),
            );
        });

        it('should NOT mark absent if checked in', async () => {
            (prismaClient.employee.findMany as jest.Mock).mockResolvedValue([
                { id: 'emp-1' },
            ]);
            (prismaClient.attendance.findFirst as jest.Mock).mockResolvedValue({
                id: 'att-1',
            });

            await service.handleAbsentMarking();

            expect(prismaClient.attendance.create).not.toHaveBeenCalled();
        });
    });
});

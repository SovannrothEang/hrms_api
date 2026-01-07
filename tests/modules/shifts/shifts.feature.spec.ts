// Mock Guards global replacement
jest.mock('src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'user-id-123', roles: ['ADMIN'] };
            return true;
        }
    }
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() { return true; }
    }
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ShiftsController } from '../../../src/modules/shifts/shifts.controller';
import { ShiftsService } from '../../../src/modules/shifts/shifts.service';
import { Result } from '../../../src/common/logic/result';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Mock Service
const mockShiftsService = {
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('ShiftsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ShiftsController],
            providers: [
                { provide: ShiftsService, useValue: mockShiftsService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/shifts (GET)', () => {
        const mockShifts = [{ id: '1', name: 'Shift 1' }];
        mockShiftsService.findAllAsync.mockResolvedValue(Result.ok(mockShifts));

        return request(app.getHttpServer())
            .get('/shifts')
            .expect(200)
            .expect(mockShifts);
    });


    it('/shifts (POST)', () => {
        const dto = { name: 'New Shift', startTime: '09:00', endTime: '18:00', workDays: '1' };
        const responseDto = { id: 'new-id', ...dto };

        mockShiftsService.createAsync.mockResolvedValue(Result.ok(responseDto));

        return request(app.getHttpServer())
            .post('/shifts')
            .send(dto)
            .expect(201)
            .expect(responseDto);
    });

    // Add more tests for Validation failure, Error handling, etc.
});

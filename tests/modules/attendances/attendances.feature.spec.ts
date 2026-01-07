import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../src/common/logic/result';
import { AttendancesController } from '../../../src/modules/attendances/attendances.controller';
import { AttendancesService } from '../../../src/modules/attendances/attendances.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Mock Guards
jest.mock('src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'admin-id', roles: ['ADMIN'] };
            return true;
        }
    }
}));
jest.mock('src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() { return true; }
    }
}));

const mockService = {
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
};

describe('AttendancesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AttendancesController],
            providers: [
                { provide: AttendancesService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/attendances/check-in (POST) should check in', () => {
        const dto = { employeeId: 'emp-1' };
        mockService.checkIn.mockResolvedValue(Result.ok({ id: '1' }));

        return request(app.getHttpServer())
            .post('/attendances/check-in')
            .send(dto)
            .expect(201);
    });

    it('/attendances/check-out (POST) should check out', () => {
        const dto = { employeeId: 'emp-1' };
        mockService.checkOut.mockResolvedValue(Result.ok({ id: '1' }));

        return request(app.getHttpServer())
            .post('/attendances/check-out')
            .send(dto)
            .expect(200);
    });

    it('/attendances (GET) should list', () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        return request(app.getHttpServer())
            .get('/attendances')
            .expect(200);
    });
});

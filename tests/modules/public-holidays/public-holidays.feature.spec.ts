import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PublicHolidaysController } from '../../../src/modules/public-holidays/public-holidays.controller';
import { PublicHolidaysService } from '../../../src/modules/public-holidays/public-holidays.service';
import { Result } from '../../../src/common/logic/result';
// Mock Guards global replacement
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
        canActivate() {
            return true;
        }
    }
}));

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

// Mock Service
const mockService = {
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('PublicHolidaysController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [PublicHolidaysController],
            providers: [
                { provide: PublicHolidaysService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/public-holidays (GET)', () => {
        const mockHolidays = [{ id: '1', name: 'NY' }];
        mockService.findAllAsync.mockResolvedValue(Result.ok(mockHolidays));

        return request(app.getHttpServer())
            .get('/public-holidays')
            .expect(200)
            .expect(mockHolidays);
    });

    it('/public-holidays (POST)', () => {
        const dto = { name: 'Labor Day', date: '2026-05-01', isRecurring: true };
        const responseDto = { id: 'new-id', ...dto, date: new Date(dto.date) };

        mockService.createAsync.mockResolvedValue(Result.ok(responseDto));

        return request(app.getHttpServer())
            .post('/public-holidays')
            .send(dto)
            .expect(201)
            // .expect(res => ...) // Dates validation might need strict checking
            .expect((res) => {
                expect(res.body.name).toBe(dto.name);
                expect(res.body.id).toBe('new-id');
            });
    });
});

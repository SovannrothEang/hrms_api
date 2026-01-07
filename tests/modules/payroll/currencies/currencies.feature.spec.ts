import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../../src/common/logic/result';
import { CurrenciesController } from '../../../../src/modules/payroll/currencies/currencies.controller';
import { CurrenciesService } from '../../../../src/modules/payroll/currencies/currencies.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

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
        canActivate() { return true; }
    }
}));

const mockService = {
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('CurrenciesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [CurrenciesController],
            providers: [
                { provide: CurrenciesService, useValue: mockService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/currencies (POST) should create currency', () => {
        const dto = { code: 'EUR', name: 'Euro', symbol: '€', country: 'EU' };
        mockService.createAsync.mockResolvedValue(Result.ok({ id: '1', ...dto }));

        return request(app.getHttpServer())
            .post('/currencies')
            .send(dto)
            .expect(201)
            .expect((res) => {
                expect(res.body.code).toBe('EUR');
            });
    });

    it('/currencies (GET) should return list', () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        return request(app.getHttpServer())
            .get('/currencies')
            .expect(200)
            .expect([]);
    });
});

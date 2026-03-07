import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../../src/common/logic/result';
import { CurrenciesController } from '../../../../src/modules/payroll/currencies/currencies.controller';
import { CurrenciesService } from '../../../../src/modules/payroll/currencies/currencies.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../src/common/guards/roles.guard';

// Mock Guards global replacement
jest.mock('../../../../src/common/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class {
        canActivate(context: any) {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: 'admin-id', roles: ['ADMIN'] };
            return true;
        }
    },
}));
jest.mock('../../../../src/common/guards/roles.guard', () => ({
    RolesGuard: class {
        canActivate() {
            return true;
        }
    },
}));

const mockService = {
    createAsync: jest.fn(),
    findAllAsync: jest.fn(),
    findAllFilteredAsync: jest.fn(),
    findAllPaginatedAsync: jest.fn(),
    findOneByIdAsync: jest.fn(),
    deleteAsync: jest.fn(),
};

describe('CurrenciesController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await NestTest.createTestingModule(
            {
                controllers: [CurrenciesController],
                providers: [
                    { provide: CurrenciesService, useValue: mockService },
                ],
            },
        ).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/currencies (POST) should create currency', async () => {
        const dto = { code: 'EUR', name: 'Euro', symbol: '€', country: 'EU' };
        mockService.createAsync.mockResolvedValue(
            Result.ok({ id: '1', ...dto }),
        );

        await request(app.getHttpServer())
            .post('/currencies')
            .send(dto)
            .expect(201)
            .expect((res) => {
                expect(res.body.code).toBe('EUR');
            });
    });

    it('/currencies (GET) should return list', async () => {
        mockService.findAllAsync.mockResolvedValue(Result.ok([]));
        const {
            ResultPagination,
        } = require('../../../../src/common/logic/result-pagination');
        mockService.findAllFilteredAsync = jest
            .fn()
            .mockResolvedValue(Result.ok(ResultPagination.of([], 0, 1, 10)));
        mockService.findAllPaginatedAsync = jest
            .fn()
            .mockResolvedValue(Result.ok(ResultPagination.of([], 0, 1, 10)));

        await request(app.getHttpServer())
            .get('/currencies')
            .expect(200)
            .expect({
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0,
                    hasNext: false,
                    hasPrevious: false,
                },
            });
    });

    it('/currencies/:id (GET) should return single currency', async () => {
        mockService.findOneByIdAsync.mockResolvedValue(
            Result.ok({ id: '1', code: 'EUR' }),
        );
        await request(app.getHttpServer())
            .get('/currencies/1')
            .expect(200)
            .expect((res) => {
                expect(res.body.code).toBe('EUR');
            });
    });

    it('/currencies/:id (GET) should throw on not found', async () => {
        mockService.findOneByIdAsync.mockResolvedValue(
            Result.fail('Currency not found'),
        );
        await request(app.getHttpServer())
            .get('/currencies/non-existent')
            .expect(404);
    });

    it('/currencies/:id (DELETE) should delete currency', async () => {
        mockService.deleteAsync.mockResolvedValue(Result.ok());
        await request(app.getHttpServer()).delete('/currencies/1').expect(204);
    });

    it('/currencies/:id (DELETE) should throw on service failure', async () => {
        mockService.deleteAsync.mockResolvedValue(
            Result.fail('Currency not found'),
        );
        await request(app.getHttpServer())
            .delete('/currencies/non-existent')
            .expect(404);
    });

    it('/currencies (POST) should throw on service failure', async () => {
        const dto = {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            country: 'USA',
        };
        mockService.createAsync.mockResolvedValue(
            Result.fail('Currency code already exists'),
        );
        await request(app.getHttpServer())
            .post('/currencies')
            .send(dto)
            .expect(400);
    });
});

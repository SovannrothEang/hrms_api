import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Result } from '../../../../src/common/logic/result';
import { ResultPagination } from '../../../../src/common/logic/result-pagination';
import { TaxBracketsController } from '../../../../src/modules/payroll/tax-brackets/tax-brackets.controller';
import { TaxBracketsService } from '../../../../src/modules/payroll/tax-brackets/tax-brackets.service';
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
    },
}));
jest.mock('src/common/guards/roles.guard', () => ({
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
    deleteAsync: jest.fn(),
};

describe('TaxBracketsController (Feature)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [TaxBracketsController],
            providers: [{ provide: TaxBracketsService, useValue: mockService }],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('/tax-brackets (POST) should create bracket', () => {
        const dto = {
            currencyCode: 'USD',
            countryCode: 'US',
            taxYear: 2026,
            bracketName: 'Tier 1',
            minAmount: 0,
            maxAmount: 10000,
            taxRate: 0.1,
            fixedAmount: 0,
        };
        mockService.createAsync.mockResolvedValue(
            Result.ok({ id: '1', ...dto }),
        );

        return request(app.getHttpServer())
            .post('/tax-brackets')
            .send(dto)
            .expect(201);
    });

    it('/tax-brackets (GET) should filter', () => {
        mockService.findAllFilteredAsync.mockResolvedValue(
            Result.ok(ResultPagination.of([], 0, 1, 10)),
        );
        return request(app.getHttpServer())
            .get('/tax-brackets?country=US&year=2026')
            .expect(200);
    });

    it('/tax-brackets/:id (DELETE) should delete bracket', () => {
        mockService.deleteAsync.mockResolvedValue(Result.ok());
        return request(app.getHttpServer())
            .delete('/tax-brackets/1')
            .expect(204);
    });

    it('/tax-brackets (POST) should throw on service failure', () => {
        const dto = {
            currencyCode: 'XXX',
            countryCode: 'US',
            taxYear: 2026,
            bracketName: 'Tier 1',
            minAmount: 0,
            maxAmount: 10000,
            taxRate: 0.1,
            fixedAmount: 0,
        };
        mockService.createAsync.mockResolvedValue(
            Result.fail('Invalid Currency Code'),
        );
        return request(app.getHttpServer())
            .post('/tax-brackets')
            .send(dto)
            .expect(400);
    });

    it('/tax-brackets (GET) should throw on service failure', () => {
        mockService.findAllFilteredAsync.mockResolvedValue(
            Result.fail('Failed to fetch'),
        );
        return request(app.getHttpServer()).get('/tax-brackets').expect(400);
    });

    it('/tax-brackets/:id (DELETE) should throw on service failure', () => {
        mockService.deleteAsync.mockResolvedValue(Result.fail('Not found'));
        return request(app.getHttpServer())
            .delete('/tax-brackets/non-existent')
            .expect(404);
    });
});

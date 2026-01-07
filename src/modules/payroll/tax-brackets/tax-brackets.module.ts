import { Module } from '@nestjs/common';
import { TaxBracketsController } from './tax-brackets.controller';
import { TaxBracketsService } from './tax-brackets.service';

@Module({
    controllers: [TaxBracketsController],
    providers: [TaxBracketsService],
    exports: [TaxBracketsService]
})
export class TaxBracketsModule { }

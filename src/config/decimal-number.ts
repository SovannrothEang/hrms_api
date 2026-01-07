import { Decimal } from '@prisma/client/runtime/client';

export class DecimalNumber extends Decimal {
    constructor(value = 0) {
        super(value);
    }
}

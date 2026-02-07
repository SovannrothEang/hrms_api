import { Decimal } from '@prisma/client/runtime/client';
import { TransformFnParams } from "class-transformer";

export const toDecimal = ({ value }: TransformFnParams) => {
    if (value === null || value === undefined || value === '') return null;

    try {
        return new DecimalNumber(value as any);
    } catch {
        return null;
    }
};

export class DecimalNumber extends Decimal {
    constructor(value: Decimal.Value = 0) {
        super(value ?? 0);
    }
}

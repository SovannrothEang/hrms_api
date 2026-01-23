import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export class BusinessError extends HttpException {
    constructor(message: string, code: ErrorCode = ErrorCode.BUSINESS_ERROR) {
        super(
            {
                statusCode: HttpStatus.BAD_REQUEST,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

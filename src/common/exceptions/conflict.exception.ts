import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export class ConflictException extends HttpException {
    constructor(message: string, code: ErrorCode = ErrorCode.CONFLICT) {
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.CONFLICT,
        );
    }
}

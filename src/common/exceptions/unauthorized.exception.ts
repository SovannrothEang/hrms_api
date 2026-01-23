import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export class UnauthorizedException extends HttpException {
    constructor(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED) {
        super(
            {
                statusCode: HttpStatus.UNAUTHORIZED,
                code,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.UNAUTHORIZED,
        );
    }
}

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export class NotFoundException extends HttpException {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} with id ${id} not found`
            : `${resource} not found`;
        super(
            {
                statusCode: HttpStatus.NOT_FOUND,
                code: ErrorCode.NOT_FOUND,
                message,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

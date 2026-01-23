import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let statusCode = HttpStatus.BAD_REQUEST;
        let message = 'Database error';
        let code = 'DATABASE_ERROR';

        switch (exception.code) {
            case 'P2002':
                statusCode = HttpStatus.CONFLICT;
                message = 'Unique constraint violation';
                code = 'UNIQUE_CONSTRAINT_VIOLATION';
                break;
            case 'P2025':
                statusCode = HttpStatus.NOT_FOUND;
                message = 'Record not found';
                code = 'RECORD_NOT_FOUND';
                break;
            case 'P2003':
                statusCode = HttpStatus.BAD_REQUEST;
                message = 'Foreign key constraint violation';
                code = 'FOREIGN_KEY_VIOLATION';
                break;
            case 'P2023':
                statusCode = HttpStatus.BAD_REQUEST;
                message = 'Inconsistent column data';
                code = 'INCONSISTENT_DATA';
                break;
            default:
                statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Database error occurred';
                code = 'DATABASE_ERROR';
        }

        response.status(statusCode).json({
            statusCode,
            code,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}

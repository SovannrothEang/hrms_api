import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger as PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SECURITY_HEADERS } from './common/security/constants/security.constants';

const APP_URL = process.env.NEXT_APP_URL || ('http://localhost:3000' as string);

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    app.useLogger(app.get(PinoLogger));
    app.use(cookieParser());
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
    );

    const isDev = process.env.NODE_ENV !== 'production';
    app.enableCors({
        // origin: isDev ? true : APP_URL, // Allow all origins in dev for network access
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            SECURITY_HEADERS.CSRF_TOKEN,
            SECURITY_HEADERS.SESSION_ID,
            SECURITY_HEADERS.REQUEST_ID,
        ],
        exposedHeaders: [SECURITY_HEADERS.REQUEST_ID],
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalFilters(
        new PrismaExceptionFilter(),
        new HttpExceptionFilter(),
    );
    app.useGlobalInterceptors(new TransformInterceptor());

    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
        .setTitle('HRMS API')
        .setDescription('The HRMS API description')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = 'api/docs';
    SwaggerModule.setup(swaggerPath, app, document);

    const port = process.env.PORT ?? 3001;
    await app.listen(port, '0.0.0.0');

    const logger = new Logger('Bootstrap');
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Local Network: http://0.0.0.0:${port}`);
    logger.log(
        `Swagger documentation: http://localhost:${port}/${swaggerPath}`,
    );
    logger.log(`Network Access: http://<YOUR_IP>:${port}/${swaggerPath}`);
}
void bootstrap();

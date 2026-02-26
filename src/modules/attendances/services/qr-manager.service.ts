import {
    Injectable,
    Logger,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../../common/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QrManagerService {
    private readonly logger = new Logger(QrManagerService.name);
    private readonly QR_SECRET = process.env.QR_SECRET || 'qrSuperSecretKey';
    private readonly QR_EXPIRY = 60; // 60 seconds
    private readonly qrDirectory = path.join(process.cwd(), 'public', 'qrs');

    constructor(
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
    ) {
        // Ensure directory exists
        if (!fs.existsSync(this.qrDirectory)) {
            fs.mkdirSync(this.qrDirectory, { recursive: true });
        }
    }

    async generateToken(type: 'IN' | 'OUT'): Promise<{ token: string; qrUrl: string }> {
        const jti = uuidv4();
        const payload = {
            type,
            iat: Math.floor(Date.now() / 1000),
            jti,
        };

        const token = await this.jwtService.signAsync(payload, {
            secret: this.QR_SECRET,
            expiresIn: `${this.QR_EXPIRY}s`,
        });

        // Generate QR code image
        const fileName = `qr-${jti}.png`;
        const filePath = path.join(this.qrDirectory, fileName);
        await QRCode.toFile(filePath, token);

        const appUrl = process.env.API_URL || 'http://localhost:3001';
        const qrUrl = `${appUrl}/qrs/${fileName}`;

        return { token, qrUrl };
    }

    async verifyToken(
        token: string,
        expectedType: 'IN' | 'OUT',
    ): Promise<void> {
        try {
            const payload = await this.jwtService.verifyAsync<{
                type: string;
                jti: string;
            }>(token, {
                secret: this.QR_SECRET,
            });

            if (payload.type !== expectedType) {
                throw new BadRequestException(
                    'Invalid QR type for this operation',
                );
            }

            // Check if token has been replayed
            const nonceKey = `qr_nonce:${payload.jti}`;
            const isUsed = await this.redisService.get(nonceKey);

            if (isUsed) {
                throw new UnauthorizedException(
                    'QR code has already been scanned',
                );
            }

            // Mark nonce as used until it would naturally expire
            await this.redisService.set(nonceKey, '1', this.QR_EXPIRY);
        } catch (error) {
            if (
                error instanceof UnauthorizedException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            this.logger.error(
                `QR Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new UnauthorizedException('Invalid or expired QR code');
        }
    }
}

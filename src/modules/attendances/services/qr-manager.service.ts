import {
    Injectable,
    Logger,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../../common/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrManagerService {
    private readonly logger = new Logger(QrManagerService.name);
    private readonly QR_SECRET = process.env.QR_SECRET || 'qrSuperSecretKey';
    private readonly QR_EXPIRY = 60; // 60 seconds

    constructor(
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
    ) {}

    async generateToken(type: 'IN' | 'OUT'): Promise<string> {
        const payload = {
            type,
            iat: Math.floor(Date.now() / 1000),
            jti: uuidv4(),
        };

        return this.jwtService.signAsync(payload, {
            secret: this.QR_SECRET,
            expiresIn: `${this.QR_EXPIRY}s`,
        });
    }

    async verifyToken(
        token: string,
        expectedType: 'IN' | 'OUT',
    ): Promise<void> {
        try {
            const payload = await this.jwtService.verifyAsync(token, {
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
            this.logger.error(`QR Verification failed: ${error.message}`);
            throw new UnauthorizedException('Invalid or expired QR code');
        }
    }
}

import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis | null = null;
    private isConnected = false;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit(): Promise<void> {
        const host = this.configService.get<string>('REDIS_HOST');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD');

        if (!host) {
            this.logger.warn(
                'REDIS_HOST not configured - Redis features disabled (using in-memory fallback)',
            );
            return;
        }

        try {
            this.client = new Redis({
                host,
                port,
                password: password || undefined,
                retryStrategy: (times) => {
                    if (times > 3) {
                        this.logger.error(
                            'Redis connection failed after 3 retries',
                        );
                        return null;
                    }
                    return Math.min(times * 200, 2000);
                },
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                this.logger.log(`Connected to Redis at ${host}:${port}`);
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                this.logger.error(`Redis error: ${err.message}`);
            });

            this.client.on('close', () => {
                this.isConnected = false;
                this.logger.warn('Redis connection closed');
            });

            await this.client.connect();
        } catch (error) {
            this.logger.error(`Failed to connect to Redis: ${error}`);
            this.client = null;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.logger.log('Redis connection closed');
        }
    }

    isAvailable(): boolean {
        return this.isConnected && this.client !== null;
    }

    async get(key: string): Promise<string | null> {
        if (!this.client) return null;
        try {
            return await this.client.get(key);
        } catch (error) {
            this.logger.error(`Redis GET error for key ${key}: ${error}`);
            return null;
        }
    }

    async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<boolean> {
        if (!this.client) return false;
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, value);
            }
            return true;
        } catch (error) {
            this.logger.error(`Redis SET error for key ${key}: ${error}`);
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            this.logger.error(`Redis DEL error for key ${key}: ${error}`);
            return false;
        }
    }

    async sadd(key: string, ...members: string[]): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.sadd(key, ...members);
            return true;
        } catch (error) {
            this.logger.error(`Redis SADD error for key ${key}: ${error}`);
            return false;
        }
    }

    async srem(key: string, ...members: string[]): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.srem(key, ...members);
            return true;
        } catch (error) {
            this.logger.error(`Redis SREM error for key ${key}: ${error}`);
            return false;
        }
    }

    async smembers(key: string): Promise<string[]> {
        if (!this.client) return [];
        try {
            return await this.client.smembers(key);
        } catch (error) {
            this.logger.error(`Redis SMEMBERS error for key ${key}: ${error}`);
            return [];
        }
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.expire(key, ttlSeconds);
            return true;
        } catch (error) {
            this.logger.error(`Redis EXPIRE error for key ${key}: ${error}`);
            return false;
        }
    }

    async keys(pattern: string): Promise<string[]> {
        if (!this.client) return [];
        try {
            return await this.client.keys(pattern);
        } catch (error) {
            this.logger.error(
                `Redis KEYS error for pattern ${pattern}: ${error}`,
            );
            return [];
        }
    }

    async mget(...keys: string[]): Promise<(string | null)[]> {
        if (!this.client) return keys.map(() => null);
        try {
            return await this.client.mget(...keys);
        } catch (error) {
            this.logger.error(`Redis MGET error: ${error}`);
            return keys.map(() => null);
        }
    }

    async ttl(key: string): Promise<number> {
        if (!this.client) return -2;
        try {
            return await this.client.ttl(key);
        } catch (error) {
            this.logger.error(`Redis TTL error for key ${key}: ${error}`);
            return -2;
        }
    }
}

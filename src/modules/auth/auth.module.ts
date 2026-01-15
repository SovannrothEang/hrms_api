import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { UserContextService } from './user-context.service';
import { UsersService } from '../iam/users/users.service';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'superSecretKey',
            signOptions: {
                audience: 'hrms_audience',
                issuer: 'hrms_issuer',
                algorithm: 'HS256',
                expiresIn: '1h',
            },
        }),
    ],
    providers: [AuthService, JwtStrategy, UsersService, UserContextService],
    controllers: [AuthController],
    exports: [AuthService, UserContextService],
})
export class AuthModule {}

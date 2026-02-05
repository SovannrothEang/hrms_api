import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { UserContextService } from './user-context.service';
import { UsersService } from '../iam/users/users.service';
import { AttendancesModule } from '../attendances/attendances.module';

@Module({
    imports: [
        PassportModule,
        forwardRef(() => AttendancesModule),
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
    exports: [AuthService, UserContextService, JwtModule],
})
export class AuthModule {}

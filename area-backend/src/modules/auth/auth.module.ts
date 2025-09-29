import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthEmailController} from './auth.email.controller';
import { GenericAuthLinkingController } from './controllers/auth.linking.controller';
import { GenericAuthIdentityController } from './controllers/auth.identity.controller';
import { GenericAuthTokenController } from './controllers/auth.token.controller';
import {UsersModule} from '../users/users.module';
import {RedisModule} from '../redis/redis.module';
import {EmailModule} from '../email/email.module';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule, ConfigService} from '@nestjs/config';
import { AesGcmTokenCrypto } from './core/TokenCrypto';
import { PrismaTokenStore } from './core/TokenStore';
import { OAuth2Client } from './core/OAuth2Client';

@Module({
    imports: [
        UsersModule,
        RedisModule,
        EmailModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                secret: cfg.get<string>('JWT_SECRET')!,
                signOptions: {expiresIn: '1h'},
            }),
        }),
    ],
    controllers: [
        AuthEmailController,
        GenericAuthIdentityController,
        GenericAuthLinkingController,
        GenericAuthTokenController,
    ],
    providers: [AuthService, AesGcmTokenCrypto, PrismaTokenStore, OAuth2Client],
    exports: [AuthService]
})
export class AuthModule {
}

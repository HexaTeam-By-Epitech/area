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

/**
 * Authentication module aggregating email/password and generic OAuth/OIDC flows.
 *
 * Exposes controllers for email auth as well as generic identity, linking,
 * and token refresh endpoints. Provides core services for token encryption,
 * persistent token storage, and an OAuth2 client wrapper.
 */
@Module({
    imports: [
        // Domain modules used by authentication flows
        UsersModule,
        RedisModule,
        EmailModule,
        ConfigModule,
        // JWT used for issuing short-lived session tokens
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
    // Providers available within the module
    providers: [AuthService, AesGcmTokenCrypto, PrismaTokenStore, OAuth2Client],
    // Export AuthService so other modules can trigger auth flows
    exports: [AuthService]
})
export class AuthModule {
}

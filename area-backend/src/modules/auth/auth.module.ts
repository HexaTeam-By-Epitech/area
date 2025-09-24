import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthEmailController} from './auth.email.controller';
import {AuthGoogleIdentityController} from './auth.google.identity.controller';
import {AuthGoogleLinkingController} from './auth.google.linking.controller';
import {AuthSpotifyLinkingController} from './auth.spotify.linking.controller';
import {AuthTokenController} from './auth.token.controller';
import {UsersModule} from '../users/users.module';
import {RedisModule} from '../redis/redis.module';
import {EmailModule} from '../email/email.module';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule, ConfigService} from '@nestjs/config';

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
        AuthGoogleIdentityController,
        AuthGoogleLinkingController,
        AuthSpotifyLinkingController,
        AuthTokenController,
    ],
    providers: [AuthService],
    exports: [AuthService]
})
export class AuthModule {
}

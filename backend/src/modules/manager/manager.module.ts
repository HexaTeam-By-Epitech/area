import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { DiscordMessageService } from '../actions/discord/message.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ActionPollingService } from './polling/action-polling.service';
import { GmailSendService } from '../reactions/gmail/send.service';
import { GmailNewMailService } from '../actions/gmail/new-mail.service';
import { PlaceholderReplacementService } from '../../common/services/placeholder-replacement.service';

/**
 * Manager module orchestrating AREA logic (Actions <-> Reactions).
 * Wires persistence (Prisma), caching (Redis), auth, and action pollers.
 * Exposes `ManagerController` and exports `ManagerService`.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [ManagerController],
  providers: [ManagerService, SpotifyLikeService, DiscordMessageService, ActionPollingService, GmailSendService, GmailNewMailService, PlaceholderReplacementService],
  exports: [ManagerService],
})
export class ManagerModule {}

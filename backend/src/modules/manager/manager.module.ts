import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { DiscordMessageService } from '../actions/discord/message.service';
import { GmailNewMailService } from '../actions/gmail/new-mail.service';
import { NotionDatabaseItemService } from '../actions/notion/database-item.service';
import { SlackNewMessageService } from '../actions/slack/new-message.service';
import { GmailSendService } from '../reactions/gmail/send.service';
import { DiscordSendService } from '../reactions/discord/send.service';
import { SpotifyLikeReactionService } from '../reactions/spotify/like.service';
import { SpotifyPauseService } from '../reactions/spotify/pause.service';
import { SpotifyResumeService } from '../reactions/spotify/resume.service';
import { SlackSendService } from '../reactions/slack/send.service';
import { ActionPollingService } from './polling/action-polling.service';
import { PlaceholderReplacementService } from '../../common/services/placeholder-replacement.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    DiscordBotModule,
  ],
  controllers: [ManagerController],
  providers: [
    ManagerService,
    SpotifyLikeService,
    DiscordMessageService,
    GmailNewMailService,
    NotionDatabaseItemService,
    SlackNewMessageService,
    GmailSendService,
    DiscordSendService,
    SpotifyLikeReactionService,
    SpotifyPauseService,
    SpotifyResumeService,
    SlackSendService,
    ActionPollingService,
    PlaceholderReplacementService,
  ],
  exports: [ManagerService],
})
export class ManagerModule {}

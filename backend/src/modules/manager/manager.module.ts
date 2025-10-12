import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { DiscordMessageService } from '../actions/discord/message.service';
import { GmailNewMailService } from '../actions/gmail/new-mail.service';
import { GmailSendService } from '../reactions/gmail/send.service';
import { DiscordSendService } from '../reactions/discord/send.service';
import { ActionPollingService } from './polling/action-polling.service';
import { PlaceholderReplacementService } from '../../common/services/placeholder-replacement.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ManagerController],
  providers: [
    ManagerService,
    SpotifyLikeService,
    DiscordMessageService,
    GmailNewMailService,
    GmailSendService,
    DiscordSendService,
    ActionPollingService,
    PlaceholderReplacementService,
  ],
  exports: [ManagerService],
})
export class ManagerModule {}

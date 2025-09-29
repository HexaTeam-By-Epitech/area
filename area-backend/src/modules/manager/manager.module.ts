import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ActionPollingService } from '../actions/polling/ActionPollingService';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule
  ],
  controllers: [ManagerController],
  providers: [ManagerService, SpotifyLikeService, ActionPollingService],
  exports: [ManagerService],
})
export class ManagerModule {}

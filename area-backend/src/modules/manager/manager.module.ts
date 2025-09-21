import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
  ],
  controllers: [ManagerController],
  providers: [ManagerService, SpotifyLikeService],
  exports: [ManagerService],
})
export class ManagerModule {}

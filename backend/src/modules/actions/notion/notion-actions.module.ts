import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotionActionsController } from './notion-actions.controller';
import { NotionDatabaseItemService } from './database-item.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { RedisModule } from '../../redis/redis.module';

/**
 * Module for Notion actions functionality.
 * Provides services and controllers for monitoring Notion databases.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [NotionActionsController],
  providers: [NotionDatabaseItemService],
  exports: [NotionDatabaseItemService],
})
export class NotionActionsModule {}


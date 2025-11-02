import { Module } from '@nestjs/common';
import { GoogleDriveNewFileService } from './new-file.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [AuthModule, UsersModule, RedisModule],
  providers: [GoogleDriveNewFileService],
  exports: [GoogleDriveNewFileService],
})
export class GoogleDriveActionsModule {}

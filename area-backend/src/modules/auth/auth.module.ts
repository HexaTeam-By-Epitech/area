import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [UsersModule, RedisModule, EmailModule],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule {}

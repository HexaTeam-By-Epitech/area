import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ManagerModule } from './modules/manager/manager.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { NotionActionsModule } from './modules/actions/notion/notion-actions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ManagerModule,
    AuthModule,
    UsersModule,
    NotionActionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

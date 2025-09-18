import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ManagerModule } from './modules/manager/manager.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ManagerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

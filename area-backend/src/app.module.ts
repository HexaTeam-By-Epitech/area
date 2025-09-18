import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ActionModule } from './modules/action/action.module';
import { ReactionModule } from './modules/reaction/reaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ActionModule,
    ReactionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

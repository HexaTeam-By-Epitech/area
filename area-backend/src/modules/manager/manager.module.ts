import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}

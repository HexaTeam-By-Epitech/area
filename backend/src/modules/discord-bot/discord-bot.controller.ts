import { Controller, Get } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';

@Controller('discord-bot')
export class DiscordBotController {
  constructor(private readonly discordBotService: DiscordBotService) {}

  /**
   * Gets the Discord bot status
   */
  @Get('status')
  getStatus() {
    const botInfo = this.discordBotService.getBotInfo();

    return {
      isConnected: this.discordBotService.isReady(),
      botInfo: botInfo || null,
      message: this.discordBotService.isReady()
        ? 'Discord bot connected and ready'
        : 'Discord bot not connected'
    };
  }
}

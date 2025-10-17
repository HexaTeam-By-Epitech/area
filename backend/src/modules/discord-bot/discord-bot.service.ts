import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { ConfigService } from '@nestjs/config';

/**
 * Discord bot service that connects automatically when the backend starts
 */
@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client | null = null;
  private isConnected = false;
  private simulationMode = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * NestJS lifecycle hook - starts the bot when the module initializes
   */
  async onModuleInit() {
    await this.connect();
  }

  /**
   * NestJS lifecycle hook - disconnects the bot properly
   */
  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connects the Discord bot or starts in simulation mode
   */
  private async connect(): Promise<void> {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');

    if (!token) {
      this.logger.warn('DISCORD_BOT_TOKEN not found in environment variables.');
      this.logger.log('🤖 Starting Discord bot in simulation mode...');
      this.simulationMode = true;
      this.isConnected = true;
      this.logger.log('✅ Discord bot in simulation mode - ready to send messages (simulation)');
      return;
    }

    try {
      // Initialize Discord client with necessary intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
      });

      this.setupEventHandlers();

      this.logger.log('Connecting Discord bot...');
      await this.client.login(token);
    } catch (error) {
      this.logger.error(`Error connecting Discord bot: ${error.message}`);
      this.logger.log('🔄 Falling back to simulation mode...');
      this.simulationMode = true;
      this.isConnected = true;
      this.client = null;
    }
  }

  /**
   * Disconnects the Discord bot
   */
  private async disconnect(): Promise<void> {
    if (this.simulationMode) {
      this.logger.log('Stopping Discord simulation mode...');
      this.isConnected = false;
      this.simulationMode = false;
      return;
    }

    if (this.isConnected && this.client) {
      this.logger.log('Disconnecting Discord bot...');
      await this.client.destroy();
      this.isConnected = false;
    }
  }

  /**
   * Sets up bot event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.once(Events.ClientReady, (readyClient) => {
      this.isConnected = true;
      this.simulationMode = false;
      this.logger.log(`✅ Discord bot connected as ${readyClient.user.tag}`);
      this.logger.log(`🤖 Bot present on ${readyClient.guilds.cache.size} server(s)`);
    });

    this.client.on(Events.MessageCreate, (message: Message) => {
      // Ignore messages from the bot itself
      if (message.author.bot) return;

      // Log messages for debug (optional)
      this.logger.debug(`Message received from ${message.author.username}: ${message.content}`);
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error(`Discord client error: ${error.message}`);
    });

    this.client.on(Events.Warn, (warning) => {
      this.logger.warn(`Discord warning: ${warning}`);
    });

    this.client.on(Events.GuildCreate, (guild) => {
      this.logger.log(`Bot added to server: ${guild.name} (${guild.id})`);
    });

    this.client.on(Events.GuildDelete, (guild) => {
      this.logger.log(`Bot removed from server: ${guild.name} (${guild.id})`);
    });
  }

  /**
   * Sends a message to a Discord channel (real or simulated)
   * @param channelId - Discord channel ID
   * @param content - Message content
   * @returns Promise<Message | null>
   */
  async sendMessage(channelId: string, content: string): Promise<Message | null> {
    if (!this.isConnected) {
      this.logger.warn('Discord bot not connected, cannot send message');
      return null;
    }

    if (this.simulationMode) {
      this.logger.log(`🎭 [SIMULATION] Message sent to channel ${channelId}: ${content}`);
      // Simulate a message object for compatibility
      return {
        id: `sim_${Date.now()}`,
        content,
        channelId,
        createdTimestamp: Date.now(),
      } as any;
    }

    if (!this.client) {
      this.logger.error('Discord client not initialized');
      return null;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel) {
        this.logger.error(`Channel ${channelId} not found`);
        return null;
      }

      // Check if the channel is a text-based channel that supports sending messages
      if (!channel.isTextBased()) {
        this.logger.error(`Channel ${channelId} is not a text channel or does not support sending messages`);
        return null;
      }

      // Additional check to ensure the channel has a send method
      if (!('send' in channel)) {
        return null;
      }

      const message = await channel.send(content);
      this.logger.log(`Message sent to channel ${channelId}: ${content}`);
      return message;
    } catch (error) {
      this.logger.error(`Error sending message to channel ${channelId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Checks if the bot is connected (real or simulation)
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the Discord client (for advanced usage)
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Gets bot information
   */
  getBotInfo() {
    if (this.simulationMode) {
      return {
        username: 'Discord Bot (Simulation)',
        tag: 'DiscordBot#0000',
        id: 'simulation_bot',
        guildsCount: 0,
        isReady: true,
        mode: 'simulation',
      };
    }

    if (!this.isConnected || !this.client?.user) {
      return null;
    }

    return {
      username: this.client.user.username,
      tag: this.client.user.tag,
      id: this.client.user.id,
      guildsCount: this.client.guilds.cache.size,
      isReady: this.client.isReady(),
      mode: 'real',
    };
  }

  /**
   * Checks if the bot is in simulation mode
   */
  isSimulationMode(): boolean {
    return this.simulationMode;
  }
}

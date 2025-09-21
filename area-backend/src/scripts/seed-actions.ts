import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Create default service
    let defaultService = await prisma.services.findFirst({
      where: { name: 'default' },
    });
    if (!defaultService) {
      defaultService = await prisma.services.create({
        data: {
          id: crypto.randomUUID(),
          name: 'default',
          description: 'Default service for actions and reactions',
          is_active: true,
        },
      });
    }

    // Create Spotify service
    let spotifyService = await prisma.services.findFirst({
      where: { name: 'spotify' },
    });
    if (!spotifyService) {
      spotifyService = await prisma.services.create({
        data: {
          id: crypto.randomUUID(),
          name: 'spotify',
          description: 'Spotify music service integration',
          is_active: true,
        },
      });
    }

    // Create notification service
    let notificationService = await prisma.services.findFirst({
      where: { name: 'notifications' },
    });
    if (!notificationService) {
      notificationService = await prisma.services.create({
        data: {
          id: crypto.randomUUID(),
          name: 'notifications',
          description: 'Notification service for emails and messages',
          is_active: true,
        },
      });
    }

    console.log('Created services:', {
      default: defaultService.id,
      spotify: spotifyService.id,
      notifications: notificationService.id,
    });

    // Create Actions
    const actions = [
      {
        name: 'spotify_has_likes',
        service_id: spotifyService.id,
        description: 'Check if user has liked songs on Spotify',
        config_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'weather_temperature_above',
        service_id: defaultService.id,
        description: 'Trigger when temperature is above threshold',
        config_schema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Temperature threshold in Celsius' },
            city: { type: 'string', description: 'City to check weather for' },
          },
          required: ['threshold', 'city'],
        },
      },
      {
        name: 'time_schedule',
        service_id: defaultService.id,
        description: 'Trigger at specific time',
        config_schema: {
          type: 'object',
          properties: {
            time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', description: 'Time in HH:MM format' },
          },
          required: ['time'],
        },
      },
    ];

    for (const actionData of actions) {
      let action = await prisma.actions.findFirst({
        where: { name: actionData.name },
      });
      
      if (!action) {
        action = await prisma.actions.create({
          data: {
            id: crypto.randomUUID(),
            ...actionData,
            is_active: true,
          },
        });
        console.log(`Created action: ${action.name} (${action.id})`);
      } else {
        action = await prisma.actions.update({
          where: { id: action.id },
          data: {
            description: actionData.description,
            config_schema: actionData.config_schema,
            is_active: true,
          },
        });
        console.log(`Updated action: ${action.name} (${action.id})`);
      }
    }

    // Create Reactions
    const reactions = [
      {
        name: 'send_email',
        service_id: notificationService.id,
        description: 'Send email notification',
        config_schema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Email subject' },
            message: { type: 'string', description: 'Email message content' },
          },
          required: ['subject', 'message'],
        },
      },
      {
        name: 'discord_message',
        service_id: notificationService.id,
        description: 'Send Discord message',
        config_schema: {
          type: 'object',
          properties: {
            webhook: { type: 'string', format: 'uri', description: 'Discord webhook URL' },
            message: { type: 'string', description: 'Message content' },
          },
          required: ['webhook', 'message'],
        },
      },
      {
        name: 'log_event',
        service_id: defaultService.id,
        description: 'Log event to database',
        config_schema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Event category' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Event priority' },
          },
        },
      },
    ];

    for (const reactionData of reactions) {
      let reaction = await prisma.reactions.findFirst({
        where: { name: reactionData.name },
      });
      
      if (!reaction) {
        reaction = await prisma.reactions.create({
          data: {
            id: crypto.randomUUID(),
            ...reactionData,
            is_active: true,
          },
        });
        console.log(`Created reaction: ${reaction.name} (${reaction.id})`);
      } else {
        reaction = await prisma.reactions.update({
          where: { id: reaction.id },
          data: {
            description: reactionData.description,
            config_schema: reactionData.config_schema,
            is_active: true,
          },
        });
        console.log(`Updated reaction: ${reaction.name} (${reaction.id})`);
      }
    }

    // Create OAuth providers if they don't exist
    const oauthProviders = [
      { id: 1, name: 'google' },
      { id: 2, name: 'spotify' },
    ];

    for (const provider of oauthProviders) {
      await prisma.oauth_providers.upsert({
        where: { id: provider.id },
        update: { is_active: true },
        create: {
          id: provider.id,
          name: provider.name,
          is_active: true,
        },
      });
      console.log(`Created/updated OAuth provider: ${provider.name}`);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
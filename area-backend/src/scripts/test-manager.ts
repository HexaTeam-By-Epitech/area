import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function testManagerService() {
  console.log('Testing Manager Service Functionality...\n');

  try {
    // 1. Create a test user
    console.log('1. Creating test user...');
    let testUser = await prisma.users.findFirst({
      where: { email: 'test@manager.com' }
    });

    if (!testUser) {
      testUser = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: 'test@manager.com',
          password_hash: 'hashed_password_here',
          is_verified: true,
          is_active: true,
        }
      });
      console.log(`✅ Created test user: ${testUser.email} (${testUser.id})`);
    } else {
      console.log(`✅ Using existing test user: ${testUser.email} (${testUser.id})`);
    }

    // 2. Check available actions
    console.log('\n2. Available Actions in Database:');
    const actions = await prisma.actions.findMany({
      where: { is_active: true },
      include: { services: true }
    });
    actions.forEach(action => {
      console.log(`  - ${action.name} (${action.services.name}): ${action.description}`);
    });

    // 3. Check available reactions
    console.log('\n3. Available Reactions in Database:');
    const reactions = await prisma.reactions.findMany({
      where: { is_active: true },
      include: { services: true }
    });
    reactions.forEach(reaction => {
      console.log(`  - ${reaction.name} (${reaction.services.name}): ${reaction.description}`);
    });

    // 4. Create a test area (spotify_has_likes -> log_event)
    console.log('\n4. Creating test area: spotify_has_likes -> log_event');
    
    const spotifyAction = await prisma.actions.findFirst({
      where: { name: 'spotify_has_likes', is_active: true }
    });
    
    const logReaction = await prisma.reactions.findFirst({
      where: { name: 'log_event', is_active: true }
    });

    if (spotifyAction && logReaction) {
      // Check if area already exists
      let testArea = await prisma.areas.findFirst({
        where: {
          user_id: testUser.id,
          action_id: spotifyAction.id,
          reaction_id: logReaction.id,
          is_active: true
        }
      });

      if (!testArea) {
        testArea = await prisma.areas.create({
          data: {
            id: crypto.randomUUID(),
            user_id: testUser.id,
            action_id: spotifyAction.id,
            reaction_id: logReaction.id,
            config: {
              action: {},
              reaction: {
                category: 'spotify',
                priority: 'medium'
              }
            },
            is_active: true
          }
        });
        console.log(`✅ Created test area: ${testArea.id}`);
      } else {
        console.log(`✅ Using existing test area: ${testArea.id}`);
      }

      // 5. Create another test area (time_schedule -> send_email)
      console.log('\n5. Creating another test area: time_schedule -> send_email');
      
      const timeAction = await prisma.actions.findFirst({
        where: { name: 'time_schedule', is_active: true }
      });
      
      const emailReaction = await prisma.reactions.findFirst({
        where: { name: 'send_email', is_active: true }
      });

      if (timeAction && emailReaction) {
        let timeArea = await prisma.areas.findFirst({
          where: {
            user_id: testUser.id,
            action_id: timeAction.id,
            reaction_id: emailReaction.id,
            is_active: true
          }
        });

        if (!timeArea) {
          timeArea = await prisma.areas.create({
            data: {
              id: crypto.randomUUID(),
              user_id: testUser.id,
              action_id: timeAction.id,
              reaction_id: emailReaction.id,
              config: {
                action: {
                  time: "10:30"  // Trigger at 10:30 AM
                },
                reaction: {
                  subject: "Daily Schedule Reminder",
                  message: "This is your scheduled daily reminder!"
                }
              },
              is_active: true
            }
          });
          console.log(`✅ Created time-based area: ${timeArea.id}`);
        } else {
          console.log(`✅ Using existing time-based area: ${timeArea.id}`);
        }
      }
    }

    // 6. Display user's areas
    console.log('\n6. User Areas:');
    const userAreas = await prisma.areas.findMany({
      where: {
        user_id: testUser.id,
        is_active: true,
        deleted_at: null
      },
      include: {
        actions: { include: { services: true } },
        reactions: { include: { services: true } }
      }
    });

    userAreas.forEach(area => {
      console.log(`  📦 Area ${area.id}:`);
      console.log(`    🎯 Action: ${area.actions.name} (${area.actions.services.name})`);
      console.log(`    ⚡ Reaction: ${area.reactions.name} (${area.reactions.services.name})`);
      console.log(`    ⚙️  Config: ${JSON.stringify(area.config, null, 2)}`);
      console.log(`    📅 Created: ${area.created_at}`);
      console.log('');
    });

    // 7. Show event logs
    console.log('7. Recent Event Logs:');
    const eventLogs = await prisma.event_logs.findMany({
      where: { user_id: testUser.id },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    if (eventLogs.length > 0) {
      eventLogs.forEach(log => {
        console.log(`  📝 ${log.event_type}: ${log.description} (${log.created_at})`);
        if (log.metadata) {
          console.log(`    📄 Metadata: ${JSON.stringify(log.metadata, null, 2)}`);
        }
      });
    } else {
      console.log('  No event logs found. The manager service will create logs when areas are executed.');
    }

    console.log('\n🎉 Manager Service Test Setup Complete!');
    console.log('\nTo see the manager in action:');
    console.log('1. Start your NestJS application');
    console.log('2. The manager service will automatically execute areas every 30 seconds');
    console.log('3. Check the event_logs table for execution logs');
    console.log('4. Use the REST API endpoints to manage areas:');
    console.log('   - GET /manager/actions - List available actions');
    console.log('   - GET /manager/reactions - List available reactions');
    console.log(`   - GET /manager/areas/${testUser.id} - Get user areas`);
    console.log(`   - POST /manager/areas/${testUser.id} - Create new area`);
    console.log('   - POST /manager/trigger - Manually trigger execution');

  } catch (error) {
    console.error('❌ Error testing manager service:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testManagerService()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testManagerService };

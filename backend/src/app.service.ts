import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getAbout() {
    return {
      client: {
        host: process.env.CLIENT_HOST || 'localhost'
      },
      server: {
        current_time: Math.floor(Date.now() / 1000),
        services: [
          {
            name: 'gmail',
            actions: [
              { name: 'new_email', description: 'Triggered when a new email is received' },
              { name: 'new_starred_email', description: 'Triggered when a new starred email is received' }
            ],
            reactions: [
              { name: 'send_email', description: 'Send an email via Gmail' }
            ]
          },
          {
            name: 'discord',
            actions: [
              { name: 'new_message', description: 'Triggered when a new message is posted in a channel' }
            ],
            reactions: [
              { name: 'send_message', description: 'Send a message to a Discord channel' }
            ]
          },
          {
            name: 'spotify',
            actions: [
              { name: 'new_saved_track', description: 'Triggered when a new track is saved to library' }
            ],
            reactions: [
              { name: 'save_track', description: 'Save a track to Spotify library' },
              { name: 'create_playlist', description: 'Create a new playlist' },
              { name: 'add_to_playlist', description: 'Add a track to a playlist' }
            ]
          }
        ]
      }
    };
  }
}

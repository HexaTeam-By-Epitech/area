import { Test, TestingModule } from '@nestjs/testing';
import { PlaceholderReplacementService } from '../../src/common/services/placeholder-replacement.service';

describe('PlaceholderReplacementService', () => {
  let service: PlaceholderReplacementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlaceholderReplacementService],
    }).compile();

    service = module.get<PlaceholderReplacementService>(PlaceholderReplacementService);
  });

  describe('replacePlaceholders', () => {
    it('should replace single placeholder in string', () => {
      const template = 'Hello {{NAME}}!';
      const data = { NAME: 'World' };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple placeholders in string', () => {
      const template = 'Song: {{SONG_NAME}} by {{ARTIST}}';
      const data = { SONG_NAME: 'Bohemian Rhapsody', ARTIST: 'Queen' };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Song: Bohemian Rhapsody by Queen');
    });

    it('should keep placeholder when data not provided', () => {
      const template = 'Hello {{NAME}}!';
      const data = { OTHER: 'Value' };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Hello {{NAME}}!');
    });

    it('should handle empty data object', () => {
      const template = 'Hello {{NAME}}!';
      const data = {};
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Hello {{NAME}}!');
    });

    it('should handle undefined data', () => {
      const template = 'Hello {{NAME}}!';
      const result = service.replacePlaceholders(template, undefined);
      expect(result).toBe('Hello {{NAME}}!');
    });

    it('should handle string with no placeholders', () => {
      const template = 'Hello World!';
      const data = { NAME: 'Test' };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Hello World!');
    });

    it('should handle numeric values in data', () => {
      const template = 'Duration: {{DURATION}} ms';
      const data = { DURATION: 354947 };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Duration: 354947 ms');
    });

    it('should handle complex Spotify example', () => {
      const template = 'You liked "{{SPOTIFY_LIKED_SONG_NAME}}" by {{SPOTIFY_LIKED_SONG_ARTIST}} from the album "{{SPOTIFY_LIKED_SONG_ALBUM}}"';
      const data = {
        SPOTIFY_LIKED_SONG_NAME: 'Bohemian Rhapsody',
        SPOTIFY_LIKED_SONG_ARTIST: 'Queen',
        SPOTIFY_LIKED_SONG_ALBUM: 'A Night at the Opera',
      };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('You liked "Bohemian Rhapsody" by Queen from the album "A Night at the Opera"');
    });

    it('should handle placeholder appearing multiple times', () => {
      const template = '{{NAME}} said hello to {{NAME}}';
      const data = { NAME: 'Alice' };
      const result = service.replacePlaceholders(template, data);
      expect(result).toBe('Alice said hello to Alice');
    });
  });

  describe('replaceInConfig', () => {
    it('should replace placeholders in flat config object', () => {
      const config = {
        to: 'user@example.com',
        subject: 'New song: {{SONG_NAME}}',
        body: 'Artist: {{ARTIST}}',
      };
      const data = { SONG_NAME: 'Bohemian Rhapsody', ARTIST: 'Queen' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual({
        to: 'user@example.com',
        subject: 'New song: Bohemian Rhapsody',
        body: 'Artist: Queen',
      });
    });

    it('should replace placeholders in nested objects', () => {
      const config = {
        email: {
          subject: 'Song: {{SONG_NAME}}',
          body: 'By {{ARTIST}}',
        },
        metadata: {
          source: 'Spotify',
        },
      };
      const data = { SONG_NAME: 'Test Song', ARTIST: 'Test Artist' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual({
        email: {
          subject: 'Song: Test Song',
          body: 'By Test Artist',
        },
        metadata: {
          source: 'Spotify',
        },
      });
    });

    it('should replace placeholders in arrays', () => {
      const config = ['{{MSG1}}', '{{MSG2}}', 'Static message'];
      const data = { MSG1: 'First', MSG2: 'Second' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual(['First', 'Second', 'Static message']);
    });

    it('should replace placeholders in arrays within objects', () => {
      const config = {
        messages: ['{{MSG1}}', '{{MSG2}}', 'Static message'],
      };
      const data = { MSG1: 'First', MSG2: 'Second' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual({
        messages: ['First', 'Second', 'Static message'],
      });
    });

    it('should handle mixed types in config', () => {
      const config = {
        stringValue: '{{PLACEHOLDER}}',
        numberValue: 42,
        boolValue: true,
        nullValue: null,
        arrayValue: ['{{ITEM}}'],
      };
      const data = { PLACEHOLDER: 'Replaced', ITEM: 'Test' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual({
        stringValue: 'Replaced',
        numberValue: 42,
        boolValue: true,
        nullValue: null,
        arrayValue: ['Test'],
      });
    });

    it('should handle empty data', () => {
      const config = {
        subject: '{{PLACEHOLDER}}',
      };
      const result = service.replaceInConfig(config, {});
      expect(result).toEqual({
        subject: '{{PLACEHOLDER}}',
      });
    });

    it('should handle undefined data', () => {
      const config = {
        subject: '{{PLACEHOLDER}}',
      };
      const result = service.replaceInConfig(config, undefined);
      expect(result).toEqual({
        subject: '{{PLACEHOLDER}}',
      });
    });

    it('should handle deeply nested structures', () => {
      const config = {
        level1: {
          level2: {
            level3: {
              message: '{{DEEP_PLACEHOLDER}}',
            },
          },
        },
      };
      const data = { DEEP_PLACEHOLDER: 'Found!' };
      const result = service.replaceInConfig(config, data);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              message: 'Found!',
            },
          },
        },
      });
    });

    it('should return string when config is a string', () => {
      const config = '{{PLACEHOLDER}}';
      const data = { PLACEHOLDER: 'Test' };
      const result = service.replaceInConfig(config, data);
      expect(result).toBe('Test');
    });
  });

  describe('extractPlaceholders', () => {
    it('should extract single placeholder', () => {
      const template = 'Hello {{NAME}}!';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(['NAME']);
    });

    it('should extract multiple placeholders', () => {
      const template = '{{SONG_NAME}} by {{ARTIST}} from {{ALBUM}}';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(['SONG_NAME', 'ARTIST', 'ALBUM']);
    });

    it('should return empty array when no placeholders', () => {
      const template = 'Hello World!';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual([]);
    });

    it('should extract duplicate placeholders', () => {
      const template = '{{NAME}} met {{NAME}}';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(['NAME', 'NAME']);
    });

    it('should handle complex template with multiple Spotify placeholders', () => {
      const template = 'Song: {{SPOTIFY_LIKED_SONG_NAME}}, Artist: {{SPOTIFY_LIKED_SONG_ARTIST}}, URL: {{SPOTIFY_LIKED_SONG_URL}}';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual([
        'SPOTIFY_LIKED_SONG_NAME',
        'SPOTIFY_LIKED_SONG_ARTIST',
        'SPOTIFY_LIKED_SONG_URL',
      ]);
    });

    it('should handle placeholders with underscores', () => {
      const template = '{{SOME_LONG_PLACEHOLDER_NAME}}';
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(['SOME_LONG_PLACEHOLDER_NAME']);
    });
  });
});

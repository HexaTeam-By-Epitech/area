import { Injectable } from '@nestjs/common';

/**
 * Service responsible for replacing placeholders in strings with actual values.
 * Placeholders use the format {{PLACEHOLDER_KEY}}.
 */
@Injectable()
export class PlaceholderReplacementService {
  /**
   * Replaces all placeholders in a string with values from the data object.
   *
   * @param template - The string containing placeholders (e.g., "Song: {{SPOTIFY_LIKED_SONG_NAME}}")
   * @param data - Object containing placeholder values keyed by placeholder name
   * @returns The string with all placeholders replaced
   *
   * @example
   * const result = replacePlaceholders(
   *   "You liked {{SPOTIFY_LIKED_SONG_NAME}} by {{SPOTIFY_LIKED_SONG_ARTIST}}",
   *   { SPOTIFY_LIKED_SONG_NAME: "Bohemian Rhapsody", SPOTIFY_LIKED_SONG_ARTIST: "Queen" }
   * );
   * // Returns: "You liked Bohemian Rhapsody by Queen"
   */
  replacePlaceholders(template: string, data?: Record<string, any>): string {
    if (!data || Object.keys(data).length === 0) {
      return template;
    }

    let result = template;
    const placeholderRegex = /\{\{([A-Z0-9_]+)\}\}/g;

    result = result.replace(placeholderRegex, (match, key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
      // If placeholder not found in data, keep the original placeholder
      return match;
    });

    return result;
  }

  /**
   * Replaces placeholders in all string values within a configuration object.
   * Recursively processes nested objects and arrays.
   *
   * @param config - Configuration object that may contain placeholders
   * @param data - Object containing placeholder values
   * @returns New configuration object with all placeholders replaced
   *
   * @example
   * const config = {
   *   subject: "New song liked: {{SPOTIFY_LIKED_SONG_NAME}}",
   *   body: "Artist: {{SPOTIFY_LIKED_SONG_ARTIST}}"
   * };
   * const result = replaceInConfig(config, data);
   */
  replaceInConfig(config: any, data?: Record<string, any>): any {
    if (!data || Object.keys(data).length === 0) {
      return config;
    }

    if (typeof config === 'string') {
      return this.replacePlaceholders(config, data);
    }

    if (Array.isArray(config)) {
      return config.map(item => this.replaceInConfig(item, data));
    }

    if (typeof config === 'object' && config !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.replaceInConfig(value, data);
      }
      return result;
    }

    return config;
  }

  /**
   * Extracts all placeholder keys from a string.
   *
   * @param template - The string to extract placeholders from
   * @returns Array of placeholder keys found in the string
   *
   * @example
   * const keys = extractPlaceholders("{{SONG_NAME}} by {{ARTIST}}");
   * // Returns: ["SONG_NAME", "ARTIST"]
   */
  extractPlaceholders(template: string): string[] {
    const placeholderRegex = /\{\{([A-Z0-9_]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(template)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }
}

/**
 * Enumeration of all available action names in the AREA system.
 * These represent the triggers that can be monitored.
 */
export enum ActionNamesEnum {
  SPOTIFY_HAS_LIKES = 'spotify_has_likes',
  GMAIL_NEW_EMAIL = 'gmail_new_email',
  DISCORD_NEW_SERVER_MESSAGE = 'discord_new_server_message',
  NOTION_NEW_DATABASE_ITEM = 'notion_new_database_item',
}

/**
 * Enumeration of all available reaction names in the AREA system.
 * These represent the responses that can be executed when actions trigger.
 */
export enum ReactionNamesEnum {
  SEND_EMAIL = 'send_email',
  LOG_EVENT = 'log_event',
  DISCORD_SEND_SERVER_MESSAGE = 'discord_send_server_message',
  SPOTIFY_LIKE_TRACK = 'spotify_like_track',
  SPOTIFY_PAUSE_PLAYBACK = 'spotify_pause_playback',
  NOTION_CREATE_DATABASE_ITEM = 'notion_create_database_item',
  SPOTIFY_RESUME_PLAYBACK = 'spotify_resume_playback',
}

/**
 * Type guard to check if a string is a valid action name
 */
export function isValidActionName(name: string): name is ActionNamesEnum {
  return Object.values(ActionNamesEnum).includes(name as ActionNamesEnum);
}

/**
 * Type guard to check if a string is a valid reaction name
 */
export function isValidReactionName(name: string): name is ReactionNamesEnum {
  return Object.values(ReactionNamesEnum).includes(name as ReactionNamesEnum);
}

/**
 * Get all available action names
 */
export function getAllActionNames(): ActionNamesEnum[] {
  return Object.values(ActionNamesEnum);
}

/**
 * Get all available reaction names
 */
export function getAllReactionNames(): ReactionNamesEnum[] {
  return Object.values(ReactionNamesEnum);
}

/**
 * Enum for all available action names in the AREA platform.
 * This replaces hardcoded strings to prevent typos and improve type safety.
 */
export enum ActionNamesEnum {
  /** Spotify action: Detects when user likes a new track */
  SPOTIFY_HAS_LIKES = 'spotify_has_likes',

  /** Gmail action: Detects new incoming emails in inbox */
  GMAIL_NEW_EMAIL = 'gmail_new_email',

  /** Discord action: Detects new messages in associated servers */
  DISCORD_NEW_MESSAGE = 'discord_new_message',
}

/**
 * Enum for all available reaction names in the AREA platform.
 * This replaces hardcoded strings to prevent typos and improve type safety.
 */
export enum ReactionNamesEnum {
  /** Send an email notification */
  SEND_EMAIL = 'send_email',

  /** Log an event to the database */
  LOG_EVENT = 'log_event',
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
 * Get all available action names as an array
 */
export function getAllActionNames(): ActionNamesEnum[] {
  return Object.values(ActionNamesEnum);
}

/**
 * Get all available reaction names as an array
 */
export function getAllReactionNames(): ReactionNamesEnum[] {
  return Object.values(ReactionNamesEnum);
}

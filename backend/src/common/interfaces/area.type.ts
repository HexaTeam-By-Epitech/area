/**
 * Common interfaces and types for the Area application.
 */

/**
 * Represents a placeholder that can be used in reaction configurations.
 */
export interface ActionPlaceholder {
  /** Unique key for the placeholder (e.g., 'SPOTIFY_LIKED_SONG_NAME') */
  key: string;
  /** Human-readable description of what this placeholder represents */
  description: string;
  /** Example value to help users understand the placeholder */
  example?: string;
}

/**
 * Result returned by an action when it triggers.
 * Contains both the status code and any associated data.
 */
export interface ActionResult {
  /**
   * Status code:
   * - 0: Action triggered successfully with new data
   * - 1: No change detected
   * - -1: Provider not linked or error
   */
  code: number;
  /**
   * Optional data associated with the action trigger.
   * This data will be used to replace placeholders in reaction configurations.
   */
  data?: Record<string, any>;
}

export interface ActionCallback {
  name: string;
  callback: (userId: string, config?: any) => Promise<any>;
  description?: string;
}

/**
 * Interface representing a reaction that can be triggered.
 */
export interface ReactionCallback {
  name: string;
  callback: (userId: string, actionResult: any, config?: any) => Promise<any>;
  description?: string;
  configSchema?: ConfigField[];
}

export interface ConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'email';
  required: boolean;
  label?: string;
  placeholder?: string;
  defaultValue?: any;
}

/**
 * Interface representing a user-defined area that binds an action to a reaction.
 */
export interface AreaExecution {
  areaId: string;
  userId: string;
  actionName: string;
  reactionName: string;
  lastExecuted?: Date;
}

/**
 * Interface for an action that can be polled periodically.
 * Implementations decide if they support a given action name and handle
 * starting/stopping polling per user.
 */
export interface PollingAction {
  /** Returns true if this poller supports the specified action name. */
  supports(actionName: string): boolean;
  /** Starts polling for a given user and emits an ActionResult to the callback. */
  start(userId: string, emit: (result: ActionResult) => void): void;
  /** Stops polling for a given user. */
  stop(userId: string): void;
  /** Returns the list of placeholders available for this action. */
  getPlaceholders(): ActionPlaceholder[];
}

export interface Reactions {
    run(userId: string, params: any): Promise<void>;
    getFields(): Field[];
}

export interface Field {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
}

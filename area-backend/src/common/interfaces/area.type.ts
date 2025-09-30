/**
 * Common interfaces and types for the Area application.
 */
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
  config?: any;
}

/**
 * Interface for an action that can be polled periodically.
 * Implementations decide if they support a given action name and handle
 * starting/stopping polling per user.
 */
export interface PollingAction {
  /** Returns true if this poller supports the specified action name. */
  supports(actionName: string): boolean;
  /** Starts polling for a given user and emits a numeric result to the callback. */
  start(userId: string, emit: (result: number) => void): void;
  /** Stops polling for a given user. */
  stop(userId: string): void;
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

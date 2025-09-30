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

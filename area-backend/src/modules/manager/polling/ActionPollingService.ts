import { Injectable, Logger } from '@nestjs/common';
import type { PollingAction } from '../../actions/types/ActionPollingType';

/**
 * Registry and coordinator for `PollingAction` implementations.
 *
 * This service keeps a list of registered pollers and forwards start/stop
 * requests to the appropriate implementation based on action name.
 */
@Injectable()
export class ActionPollingService {
  private readonly logger = new Logger(ActionPollingService.name);
  private pollers: PollingAction[] = [];

  /** Register a polling action implementation. */
  register(p: PollingAction) {
    this.pollers.push(p);
  }

  /** Returns whether any registered poller supports the action name. */
  supports(actionName: string): boolean {
    return this.pollers.some((p) => p.supports(actionName));
  }

  /**
   * Starts polling for the first poller that supports the `actionName`.
   * Logs a warning if none is found.
   */
  start(actionName: string, userId: string, emit: (result: number) => void): void {
    const poller = this.pollers.find((p) => p.supports(actionName));
    if (!poller) {
      this.logger.warn(`No poller registered for action '${actionName}'`);
      return;
    }
    poller.start(userId, emit);
  }

  /** Stops an active poll for the given user if a supporting poller exists. */
  stop(actionName: string, userId: string): void {
    const poller = this.pollers.find((p) => p.supports(actionName));
    if (!poller) return;
    poller.stop(userId);
  }
}

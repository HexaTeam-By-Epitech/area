import { Injectable, Logger } from '@nestjs/common';

export interface PollingAction {
  supports(actionName: string): boolean;
  start(userId: string, emit: (result: number) => void): void;
  stop(userId: string): void;
}

@Injectable()
export class ActionPollingService {
  private readonly logger = new Logger(ActionPollingService.name);
  private pollers: PollingAction[] = [];

  register(p: PollingAction) {
    this.pollers.push(p);
  }

  supports(actionName: string): boolean {
    return this.pollers.some((p) => p.supports(actionName));
  }

  start(actionName: string, userId: string, emit: (result: number) => void): void {
    const poller = this.pollers.find((p) => p.supports(actionName));
    if (!poller) {
      this.logger.warn(`No poller registered for action '${actionName}'`);
      return;
    }
    poller.start(userId, emit);
  }

  stop(actionName: string, userId: string): void {
    const poller = this.pollers.find((p) => p.supports(actionName));
    if (!poller) return;
    poller.stop(userId);
  }
}

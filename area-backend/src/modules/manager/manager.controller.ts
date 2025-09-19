import { Controller, Get, Param, Post } from '@nestjs/common';
import { ManagerService } from './manager.service';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post(':action/:user')
  display(@Param('action') action: string, @Param('user') user: string): string {
    if (action == null) {
      return 'No action provided.';
    }
    if (user == null) {
      return 'Access denied.';
    }
    return this.managerService.getAction(action, user);
  }
}


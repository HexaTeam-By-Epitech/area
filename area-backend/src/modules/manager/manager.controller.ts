import { Controller, Get, Param, Post } from '@nestjs/common';
import { ManagerService } from './manager.service';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post(':action/:user')
  display(@Param('action') action: string, @Param('user') user: string): string {
    if (!action || action.trim() === '') {
      return 'No action provided.';
    }
    if (!user || user.trim() === '') {
      return 'Access denied.';
    }
    return this.managerService.getAction(action, user);
  }
}


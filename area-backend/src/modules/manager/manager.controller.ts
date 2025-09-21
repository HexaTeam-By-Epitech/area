import { Controller, Get, Param, Post, Body, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ManagerService, ActionCallback, ReactionCallback } from './manager.service';

interface BindActionDto {
  actionName: string;
  reactionName: string;
  config?: {
    action?: any;
    reaction?: any;
  };
}

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  /**
   * Get available actions
   */
  @Get('actions')
  getAvailableActions(): ActionCallback[] {
    return this.managerService.getAvailableActions();
  }

  /**
   * Get available reactions
   */
  @Get('reactions')
  getAvailableReactions(): ReactionCallback[] {
    return this.managerService.getAvailableReactions();
  }

  /**
   * Bind an action to a reaction for a user
   */
  @Post('areas/:userId')
  async bindAction(
    @Param('userId') userId: string,
    @Body() bindActionDto: BindActionDto,
  ) {
    const areaId = await this.managerService.bindAction(
      userId,
      bindActionDto.actionName,
      bindActionDto.reactionName,
      bindActionDto.config,
    );
    return {
      message: 'Area created successfully',
      areaId,
      userId,
      action: bindActionDto.actionName,
      reaction: bindActionDto.reactionName,
    };
  }

  /**
   * Get all areas for a user
   */
  @Get('areas/:userId')
  async getUserAreas(@Param('userId') userId: string) {
    return await this.managerService.getUserAreas(userId);
  }

  /**
   * Deactivate an area
   */
  @Delete('areas/:areaId/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateArea(
    @Param('areaId') areaId: string,
    @Param('userId') userId: string,
  ) {
    await this.managerService.deactivateArea(areaId, userId);
    return {
      message: 'Area deactivated successfully',
      areaId,
      userId,
    };
  }

  /**
   * Manual trigger for testing area execution
   */
  @Post('trigger')
  async triggerExecution() {
    await this.managerService.triggerAreaExecution();
    return {
      message: 'Area execution triggered manually',
      timestamp: new Date().toISOString(),
    };
  }
}


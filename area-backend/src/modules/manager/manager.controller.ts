import { Controller, Get, Param, Post, Body, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ManagerService, ActionCallback, ReactionCallback } from './manager.service';
import { ApiBody } from '@nestjs/swagger/dist/decorators/api-body.decorator';
import { ApiParam, ApiProperty } from '@nestjs/swagger';

class BindActionDto {
  @ApiProperty({ description: 'Name of the action to bind', example: 'new_email' })
  actionName: string;
  @ApiProperty({ description: 'Name of the reaction to bind', example: 'send_email' })
  reactionName: string;
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
  @ApiBody({ type: BindActionDto })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  async bindAction(@Param('userId') userId: string, @Body() bindActionDto: BindActionDto) {
    const areaId = await this.managerService.bindAction(
      userId,
      bindActionDto.actionName,
      bindActionDto.reactionName,
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
}


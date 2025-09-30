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

/**
 * Controller exposing endpoints to discover actions/reactions and manage AREAs.
 */
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) { }

  /**
   * Get available actions
   * @returns List of registered action callbacks
   */
  @Get('actions')
  getAvailableActions(): ActionCallback[] {
    return this.managerService.getAvailableActions();
  }

  /**
   * Get available reactions
   * @returns List of registered reaction callbacks
   */
  @Get('reactions')
  getAvailableReactions(): ReactionCallback[] {
    return this.managerService.getAvailableReactions();
  }

  /**
   * Bind an action to a reaction for a user
   * @param userId - Target user ID
   * @param bindActionDto - Pair of action/reaction names
   * @returns Creation message and identifiers
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
   * @param userId - Target user ID
   */
  @Get('areas/:userId')
  async getUserAreas(@Param('userId') userId: string) {
    return await this.managerService.getUserAreas(userId);
  }

  /**
   * Deactivate an area
   * @param areaId - Identifier of the area to deactivate
   */
  @Delete('areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateArea(
    @Param('areaId') areaId: string
  ) {
    await this.managerService.deactivateArea(areaId);
    return {
      message: 'Area deactivated successfully',
      areaId,
    };
  }
}


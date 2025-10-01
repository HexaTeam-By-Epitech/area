import { Controller, Get, Param, Post, Body, Delete, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ActionCallback, ReactionCallback } from '../../common/interfaces/area.type';
import { ApiBody } from '@nestjs/swagger/dist/decorators/api-body.decorator';
import { ApiOperation, ApiParam, ApiProperty, ApiResponse } from '@nestjs/swagger';

class BindActionDto {
  @ApiProperty({ description: 'Name of the action to bind', example: 'new_email' })
  actionName: string;
  @ApiProperty({ description: 'Name of the reaction to bind', example: 'send_email' })
  reactionName: string;
  @ApiProperty({ description: 'Configuration for the reaction', example: { to: 'user@example.com', subject: 'New Email', body: 'You have a new email!' } })
  config: {};
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
  @ApiOperation({ summary: 'Get available actions' })
  getAvailableActions(): ActionCallback[] {
    return this.managerService.getAvailableActions();
  }

  /**
   * Get available reactions
   * @returns List of registered reaction callbacks
   */
  @Get('reactions')
  @ApiOperation({ summary: 'Get available reactions' })
  getAvailableReactions(): ReactionCallback[] {
    return this.managerService.getAvailableReactions();
  }

  /**
   * Bind an action to a reaction for a user
   * @param userId - Target user ID
   * @param bindActionDto - Pair of action/reaction names with potential configuration
   * @returns Creation message and identifiers
   */
  @Post('areas/:userId')
  @ApiBody({ type: BindActionDto })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiOperation({ summary: 'Bind an action to a reaction for a user' })
  async bindAction(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string, @Body() bindActionDto: BindActionDto) {
    const areaId = await this.managerService.bindAction(
      userId,
      bindActionDto.actionName,
      bindActionDto.reactionName,
      bindActionDto.config
    );
    return {
      message: 'Area created successfully',
      areaId,
      userId,
      action: bindActionDto.actionName,
      reaction: bindActionDto.reactionName,
      config: bindActionDto.config
    };
  }

  /**
   * Get all areas for a user
   * @param userId - Target user ID
   */
  @Get('areas/:userId')
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiOperation({ summary: 'Get all areas for a user' })
  async getUserAreas(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return await this.managerService.getUserAreas(userId);
  }

  /**
   * Deactivate an area
   * @param areaId - Identifier of the area to deactivate
   */
  @Delete('areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'areaId', description: 'ID of the area to deactivate' })
  @ApiOperation({ summary: 'Deactivate an area' })
  @ApiResponse({ status: 204, description: 'Area deactivated successfully' })
  async deactivateArea(
    @Param('areaId', new ParseUUIDPipe({ version: '4' })) areaId: string
  ) {
    await this.managerService.deactivateArea(areaId);
    return {
      message: 'Area deactivated successfully',
      areaId,
    };
  }
}

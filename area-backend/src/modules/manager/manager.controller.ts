import { Controller, Get, Param, Post, Body, Delete, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ActionCallback, ReactionCallback } from '../../common/interfaces/area.type';
import { ApiBody } from '@nestjs/swagger/dist/decorators/api-body.decorator';
import { ApiOperation, ApiParam, ApiProperty, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

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
 * All routes require JWT authentication.
 */
@ApiBearerAuth('JWT-auth')
@Controller('manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly prisma: PrismaService,
  ) { }

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
   * Bind an action to a reaction for authenticated user
   * @param authenticatedUserId - Authenticated user from JWT
   * @param bindActionDto - Pair of action/reaction names with potential configuration
   * @returns Creation message and identifiers
   */
  @Post('areas')
  @ApiBody({ type: BindActionDto })
  @ApiOperation({ summary: 'Bind an action to a reaction for authenticated user' })
  async bindAction(
    @GetUser('sub') authenticatedUserId: string,
    @Body() bindActionDto: BindActionDto
  ) {
    const areaId = await this.managerService.bindAction(
      authenticatedUserId,
      bindActionDto.actionName,
      bindActionDto.reactionName,
      bindActionDto.config
    );
    return {
      message: 'Area created successfully',
      areaId,
      userId: authenticatedUserId,
      action: bindActionDto.actionName,
      reaction: bindActionDto.reactionName,
      config: bindActionDto.config
    };
  }

  /**
   * Get all areas for authenticated user
   * @param authenticatedUserId - Authenticated user from JWT
   */
  @Get('areas')
  @ApiOperation({ summary: 'Get all areas for authenticated user' })
  async getUserAreas(@GetUser('sub') authenticatedUserId: string) {
    return await this.managerService.getUserAreas(authenticatedUserId);
  }

  /**
   * Deactivate an area (only if owned by authenticated user)
   * @param areaId - Identifier of the area to deactivate
   * @param authenticatedUserId - Authenticated user from JWT
   */
  @Delete('areas/:areaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'areaId', description: 'ID of the area to deactivate' })
  @ApiOperation({ summary: 'Deactivate an area (ownership verified)' })
  @ApiResponse({ status: 204, description: 'Area deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this area' })
  async deactivateArea(
    @Param('areaId', new ParseUUIDPipe({ version: '4' })) areaId: string,
    @GetUser('sub') authenticatedUserId: string,
  ) {
    // Verify ownership
    const area = await this.prisma.areas.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new BadRequestException('Area not found');
    }

    if (area.user_id !== authenticatedUserId) {
      throw new ForbiddenException('You do not own this area');
    }

    await this.managerService.deactivateArea(areaId);
    return {
      message: 'Area deactivated successfully',
      areaId,
    };
  }
}

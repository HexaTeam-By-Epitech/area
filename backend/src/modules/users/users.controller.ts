import { Controller, Get, Put, Delete, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * REST controller for user management (CRUD operations).
 * Most routes require JWT authentication and users can only access their own data.
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    /**
     * Get authenticated user's profile.
     * @returns The authenticated user's data.
     */
    @Get('me')
    @ApiOperation({ summary: 'Get authenticated user profile' })
    @ApiResponse({ status: 200, description: 'User profile', type: CreateUserDto })
    findMe(@GetUser('sub') userId: string) {
        return this.usersService.findOne(userId);
    }

    /**
     * Update authenticated user's profile.
     */
    @Put('me')
    @ApiOperation({ summary: 'Update authenticated user profile' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: CreateUserDto })
    updateMe(@Body() dto: UpdateUserDto, @GetUser('sub') userId: string) {
        return this.usersService.updateUser(userId, dto);
    }

    /**
     * Delete the authenticated user's account (GDPR-compliant hard delete).
     */
    @Delete('me')
    @ApiOperation({ summary: 'Delete authenticated user account (GDPR hard delete)' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    removeMe(@GetUser('sub') userId: string) {
        return this.usersService.deleteUser(userId);
    }
}

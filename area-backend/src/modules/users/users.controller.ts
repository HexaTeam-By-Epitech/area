import { Controller, Get, Post, Put, Delete, Param, Body, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
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
     * Get a user by ID (only if requesting their own profile).
     * @param id - The user ID.
     * @param authenticatedUserId - Authenticated user from JWT.
     * @returns The user if found and owned.
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID (own profile only)' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User found', type: CreateUserDto })
    @ApiResponse({ status: 403, description: 'Forbidden - Can only access own profile' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string, @GetUser('sub') authenticatedUserId: string) {
        if (id !== authenticatedUserId) {
            throw new ForbiddenException('You can only access your own profile');
        }
        return this.usersService.findOne(id);
    }

    /**
     * Create a new user (public endpoint for registration, deprecated - use /auth/register).
     * @param dto - User creation payload.
     * @returns The created user.
     */
    @Public()
    @Post()
    @ApiOperation({ summary: 'Create a new user (deprecated - use /auth/register)' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserDto })
    create(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    /**
     * Update a user by ID (only own profile).
     * @param id - The user ID.
     * @param dto - Fields to update.
     * @param authenticatedUserId - Authenticated user from JWT.
     * @returns The updated user.
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update a user by ID (own profile only)' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: CreateUserDto })
    @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profile' })
    @ApiResponse({ status: 404, description: 'User not found' })
    update(@Param('id') id: string, @Body() dto: UpdateUserDto, @GetUser('sub') authenticatedUserId: string) {
        if (id !== authenticatedUserId) {
            throw new ForbiddenException('You can only update your own profile');
        }
        return this.usersService.updateUser(id, dto);
    }

    /**
     * Delete a user by ID (only own profile).
     * @param id - The user ID.
     * @param authenticatedUserId - Authenticated user from JWT.
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user by ID (own profile only)' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - Can only delete own profile' })
    @ApiResponse({ status: 404, description: 'User not found' })
    remove(@Param('id') id: string, @GetUser('sub') authenticatedUserId: string) {
        if (id !== authenticatedUserId) {
            throw new ForbiddenException('You can only delete your own profile');
        }
        return this.usersService.deleteUser(id);
    }
}

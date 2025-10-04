import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * REST controller for user management (CRUD operations).
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    /**
     * Get all users.
     * @returns List of users.
     */
    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of users', type: [CreateUserDto] })
    findAll() {
        return this.usersService.findAll();
    }

    /**
     * Get a user by ID.
     * @param id - The user ID.
     * @returns The user if found.
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User found', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    /**
     * Create a new user.
     * @param dto - User creation payload.
     * @returns The created user.
     */
    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserDto })
    create(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    /**
     * Update a user by ID.
     * @param id - The user ID.
     * @param dto - Fields to update.
     * @returns The updated user.
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(id, dto);
    }

    /**
     * Delete a user by ID.
     * @param id - The user ID.
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    remove(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }
}

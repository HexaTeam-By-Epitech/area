import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of users', type: [CreateUserDto] })
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User found', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserDto })
    create(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    remove(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }
}

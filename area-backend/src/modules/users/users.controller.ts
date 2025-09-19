import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }
}

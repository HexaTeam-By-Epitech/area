import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.users.findMany();
    }

    async findOne(id: string) {
        const user = await this.prisma.users.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.users.findUnique({ where: { email } });
    }

    async createUser(data: CreateUserDto) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.prisma.users.create({
            data: {
                email: data.email,
                password_hash: passwordHash,
                is_verified: false,
                is_active: true,
            },
        });
    }

    async updateUser(id: string, data: UpdateUserDto) {
        return this.prisma.users.update({ where: { id }, data });
    }

    async deleteUser(id: string) {
        return this.prisma.users.delete({ where: { id } });
    }
}

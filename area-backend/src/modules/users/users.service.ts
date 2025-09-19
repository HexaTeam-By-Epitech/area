import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.user.findMany();
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async createUser(data: CreateUserDto) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                isVerified: false,
                isActive: true,
            },
        });
    }

    async updateUser(id: string, data: UpdateUserDto) {
        return this.prisma.user.update({ where: { id }, data });
    }

    async deleteUser(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }
}

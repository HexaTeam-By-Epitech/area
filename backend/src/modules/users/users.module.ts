import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Users module exposing CRUD endpoints and domain service for user management.
 * Depends on `PrismaModule` and exports `UsersService` for other modules.
 */
@Module({
    imports: [PrismaModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}

/**
 * PrismaService extends PrismaClient to manage database connection lifecycle.
 * Handles connection on module init and disconnection on module destroy.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Injectable Prisma service for NestJS.
 * Ensures database connection is established and closed properly.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    /**
     * Called when the module is initialized.
     * Connects to the database.
     */
    async onModuleInit() {
        await this.$connect(); // Establish Prisma DB connection
    }

    /**
     * Called when the module is destroyed.
     * Disconnects from the database.
     */
    async onModuleDestroy() {
        await this.$disconnect(); // Close Prisma DB connection
    }
}

import {NestFactory, Reflector} from '@nestjs/core';
import { Logger } from '@nestjs/common';
import {AppModule} from './app.module';
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger';
import {CreateUserDto} from './modules/users/dto/create-user.dto';
import {UpdateUserDto} from './modules/users/dto/update-user.dto';
import {JwtAuthGuard} from './common/guards/jwt-auth.guard';
import {JwtService} from '@nestjs/jwt';
import {ConfigService} from '@nestjs/config';

/**
 * Bootstraps the NestJS application, sets up Swagger documentation,
 * and starts the server on the specified port.
 */
async function bootstrap() {
    // Create the NestJS application instance
    const app = await NestFactory.create(AppModule);

    // Apply global JWT authentication guard
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);
    app.useGlobalGuards(new JwtAuthGuard(jwtService, reflector, configService));

    // Configure Swagger documentation with JWT Bearer authentication
    const config = new DocumentBuilder()
        .setTitle('AREA API') // Set the API title
        .setDescription('AREA API Documentation') // Set the API description
        .setVersion('1.0') // Set the API version
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth', // This name here is important for @ApiBearerAuth() decorator
        )
        .build();

    // Create the Swagger document, including extra DTO models
    const document = SwaggerModule.createDocument(app, config, {
        extraModels: [CreateUserDto, UpdateUserDto],
    });

    // Setup Swagger UI at /docs endpoint
    SwaggerModule.setup('docs', app, document);

    // Start the server on the specified host/port
    const host = process.env.HOST ?? '0.0.0.0';
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, host);

    // Print startup information using NestJS logger
    const url = await app.getUrl();
    const logger = new Logger('Bootstrap');
    logger.log(`AREA backend started in ${process.env.NODE_ENV ?? 'development'} on ${host}:${port} (${url})`);

    // Log authentication status
    if (configService.get<string>('DISABLE_AUTH_IN_DEV') === 'true' && (process.env.NODE_ENV ?? 'development') === 'development') {
        logger.warn('⚠️  AUTHENTICATION IS DISABLED IN DEVELOPMENT MODE ⚠️');
    } else {
        logger.log('🔒 JWT Authentication is ENABLED');
    }
}

// Start the application
bootstrap();

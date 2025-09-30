import {NestFactory} from '@nestjs/core';
import { Logger } from '@nestjs/common';
import {AppModule} from './app.module';
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger';
import {CreateUserDto} from './modules/users/dto/create-user.dto';
import {UpdateUserDto} from './modules/users/dto/update-user.dto';

/**
 * Bootstraps the NestJS application, sets up Swagger documentation,
 * and starts the server on the specified port.
 */
async function bootstrap() {
    // Create the NestJS application instance
    const app = await NestFactory.create(AppModule);

    // Configure Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('AREA API') // Set the API title
        .setDescription('AREA API Documentation') // Set the API description
        .setVersion('1.0') // Set the API version
        .build();

    // Create the Swagger document, including extra DTO models
    const document = SwaggerModule.createDocument(app, config, {
        extraModels: [CreateUserDto, UpdateUserDto],
    });

    // Setup Swagger UI at /api endpoint
    SwaggerModule.setup('docs', app, document);

    // Start the server on the specified host/port
    const host = process.env.HOST ?? '0.0.0.0';
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, host);

    // Print startup information using NestJS logger
    const url = await app.getUrl();
    const logger = new Logger('Bootstrap');
    logger.log(`AREA backend started in ${process.env.NODE_ENV ?? 'development'} on ${host}:${port} (${url})`);
}

// Start the application
bootstrap();

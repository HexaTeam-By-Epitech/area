import {NestFactory} from '@nestjs/core';
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
    SwaggerModule.setup('api', app, document);

    // Start the server on the specified port or default to 3000
    await app.listen(process.env.PORT ?? 3000);
}

// Start the application
bootstrap();

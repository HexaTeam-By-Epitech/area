import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CreateUserDto } from './modules/users/dto/create-user.dto';
import { UpdateUserDto } from './modules/users/dto/update-user.dto';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
        .setTitle('AREA API')
        .setDescription('AREA API Documentation')
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        extraModels: [CreateUserDto, UpdateUserDto],
    });

    SwaggerModule.setup('api', app, document);

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    preflightContinue: false,
  });

  const port = 3050;
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // validation
      forbidNonWhitelisted: true, // whitelist 
      transform: true, 
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Documentation API ')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  await app.listen(port);
  Logger.log(`Application running on port ${port}`);
}
bootstrap();

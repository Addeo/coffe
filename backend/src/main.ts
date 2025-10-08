import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  try {
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);
    console.log('App created successfully');

    // Set UTF-8 encoding for responses
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Enable CORS - completely open (for development)
    app.enableCors({
      origin: '*', // Allow absolutely all origins
      credentials: false, // Disable credentials when using wildcard
      methods: '*', // Allow all methods
      allowedHeaders: '*', // Allow all headers
      exposedHeaders: '*', // Expose all headers
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    console.log('Middleware configured');

    // Enable class-transformer serialization globally
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    console.log('ClassSerializerInterceptor enabled');

    // Global prefix for all routes
    app.setGlobalPrefix('api');
    console.log('Global prefix set');

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`Coffee Admin API is running on: http://localhost:${port}`);
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

bootstrap();

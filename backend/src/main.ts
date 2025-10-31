import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, HttpStatus, HttpException } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  try {
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);
    console.log('App created successfully');

    // Set UTF-8 encoding for responses
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Serve static APK files
    app.use('/app-debug.apk', express.static(join(__dirname, '../../app-debug.apk')));
    app.use('/CoffeeAdmin-v2.apk', express.static(join(__dirname, '../../CoffeeAdmin-v2.apk')));

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

    // Enable global validation pipe with detailed error messages
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map(error => {
            const constraints = error.constraints || {};
            return {
              property: error.property,
              value: error.value,
              constraints: Object.values(constraints),
            };
          });
          
          return new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Validation failed',
              errors: messages,
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      })
    );
    console.log('ValidationPipe enabled');

    // Enable class-transformer serialization globally
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    console.log('ClassSerializerInterceptor enabled');

    // Enable global exception filter for better error handling
    app.useGlobalFilters(new AllExceptionsFilter());
    console.log('AllExceptionsFilter enabled');

    // Global prefix for all routes
    app.setGlobalPrefix('api');
    console.log('Global prefix set');

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    console.log(`Coffee Admin API is running on: http://${host}:${port}`);
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

bootstrap();

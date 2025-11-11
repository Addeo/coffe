import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, HttpStatus, HttpException } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

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

    // IMPORTANT: Serve static APK files BEFORE setGlobalPrefix
    // Otherwise /app-debug.apk will be treated as /api/app-debug.apk
    // Path: from dist/main.js -> ../.. -> backend/ -> app-debug.apk
    // In Docker: /app/app-debug.apk (if copied there) or use absolute path
    const apkPath = process.env.APK_PATH || join(__dirname, '../../app-debug.apk');
    console.log('APK file path:', apkPath);
    console.log('Checking if APK exists at:', apkPath);
    
    // Check if file exists and log
    try {
      if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        console.log('✅ APK file found, size:', stats.size, 'bytes');
      } else {
        console.warn('⚠️ APK file NOT found at:', apkPath);
      }
    } catch (error) {
      console.warn('⚠️ Error checking APK file:', error.message);
    }
    
    // Serve APK file directly - handle exact match and trailing slash
    // Get Express instance from NestJS app
    const expressApp = app.getHttpAdapter().getInstance();
    
    const serveApkFile = (req: express.Request, res: express.Response) => {
      console.log('📥 APK download request:', req.path);
      console.log('📁 Looking for APK at:', apkPath);
      
      if (!fs.existsSync(apkPath)) {
        console.error('❌ APK file not found at:', apkPath);
        return res.status(404).json({
          statusCode: 404,
          message: 'APK file not found on server. Please copy app-debug.apk to backend/ directory.',
          path: apkPath,
          hint: 'Run: cp ./apk-builds/app-debug-1.0.2.apk backend/app-debug.apk',
        });
      }
      
      const stats = fs.statSync(apkPath);
      console.log('✅ Serving APK file, size:', stats.size, 'bytes');
      
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="app-debug.apk"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(apkPath);
      fileStream.pipe(res);
      fileStream.on('error', (error) => {
        console.error('❌ Error reading APK file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            message: 'Error reading APK file',
            error: error.message,
          });
        }
      });
      
      fileStream.on('end', () => {
        console.log('✅ APK file sent successfully');
      });
    };
    
    // Register GET route for /app-debug.apk (exact match)
    expressApp.get('/app-debug.apk', serveApkFile);
    
    // Redirect trailing slash to exact path
    expressApp.get('/app-debug.apk/', (req, res) => {
      res.redirect(301, '/app-debug.apk');
    });
    
    // Alternative APK name
    expressApp.use('/CoffeeAdmin-v2.apk', express.static(join(__dirname, '../../CoffeeAdmin-v2.apk'), {
      setHeaders: (res) => {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      },
    }));

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

    // Global prefix for all routes (must be AFTER static files!)
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

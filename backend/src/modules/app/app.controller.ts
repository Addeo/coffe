import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('version')
  getVersion() {
    return {
      version: '1.0.2',
      downloadUrl: 'http://192.144.12.102:3001/app-debug.apk',
      required: false,
      releaseNotes: 'Обновление включает новые функции и исправления ошибок.',
    };
  }
}


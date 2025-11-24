import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('version')
  getVersion() {
    // Определяем базовый URL в зависимости от окружения
    const baseUrl =
      process.env.NODE_ENV === 'production' ? 'https://coffe-ug.ru' : 'http://localhost:3001';

    return {
      version: '1.1.4', // Server version - should match latest APK version
      downloadUrl: `${baseUrl}/app-debug.apk`,
      required: false,
      releaseNotes:
        'Исправления и улучшения: добавлена пагинация в мобильной версии, улучшено сворачивание статистики, оптимизирован код компонентов.',
    };
  }
}

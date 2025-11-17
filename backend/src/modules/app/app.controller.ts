import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('version')
  getVersion() {
    // Определяем базовый URL в зависимости от окружения
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'http://192.144.12.102:3001'
        : 'http://localhost:3001';

    return {
      version: '1.1.0', // Server version - should match latest APK version
      downloadUrl: `${baseUrl}/app-debug.apk`,
      required: false,
      releaseNotes: 'Улучшение UI статистики заказов и мобильной версии. Обновлены стили и компоненты.',
    };
  }
}

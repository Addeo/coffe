import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class TestController {
  private getVersion(): string {
    try {
      // Пытаемся прочитать версию из package.json
      const packagePath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return pkg.version || '1.1.7';
      }
    } catch {
      // Fallback если не удалось прочитать
    }
    return '1.1.7';
  }

  @Get('test')
  getTest() {
    return {
      message: 'Server is working',
      timestamp: new Date(),
      version: this.getVersion(),
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: this.getVersion(),
    };
  }

  @Get('files/test')
  getFilesTest() {
    return { message: 'Files API is working', timestamp: new Date() };
  }

  @Get('test/files/order/:orderId')
  getFilesByOrder(@Param('orderId') orderId: string) {
    return {
      orderId,
      files: [
        { id: '1', name: 'test1.txt', size: 1024, originalName: 'test1.txt' },
        { id: '2', name: 'test2.pdf', size: 2048, originalName: 'test2.pdf' },
      ],
      message: 'Mock files response',
    };
  }

  @Get('simple')
  testFilesSimple() {
    return { message: 'Files test from TestController', timestamp: new Date() };
  }

  @Get('images/test')
  testImages() {
    return { message: 'Images API test', timestamp: new Date() };
  }

  @Get('test-view')
  testView() {
    return { message: 'Test view works', timestamp: new Date() };
  }

  // REMOVED: This was intercepting real file uploads!
  // @Post('files/upload')
  // uploadFile(@Body() body: any) {
  //   return {
  //     id: 'test-file-id-' + Date.now(),
  //     filename: 'uploaded-file.txt',
  //     originalName: 'uploaded-file.txt',
  //     mimetype: 'text/plain',
  //     size: 1024,
  //     message: 'File uploaded successfully',
  //   };
  // }
}

import { Controller, Get, Post, Param, Body } from '@nestjs/common';

@Controller()
export class TestController {
  @Get('test')
  getTest() {
    return { message: 'Server is working', timestamp: new Date() };
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

  @Post('files/upload')
  uploadFile(@Body() body: any) {
    return {
      id: 'test-file-id-' + Date.now(),
      filename: 'uploaded-file.txt',
      originalName: 'uploaded-file.txt',
      mimetype: 'text/plain',
      size: 1024,
      message: 'File uploaded successfully',
    };
  }
}

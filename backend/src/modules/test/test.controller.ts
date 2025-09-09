import { Controller, Get } from '@nestjs/common';

@Controller('api/test')
export class TestController {
  constructor() {}

  @Get()
  getHello() {
    return {
      message: 'Backend is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'success'
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage()
    };
  }
}

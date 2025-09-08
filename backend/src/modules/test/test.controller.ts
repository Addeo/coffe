import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get()
  getHello() {
    return { message: 'Backend is working!' };
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    // Mock login for testing error notifications
    if (body.email === 'admin@coffee.com' && body.password === 'admin123') {
      return {
        access_token: 'mock-jwt-token',
        user: {
          id: 1,
          email: body.email,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        }
      };
    } else {
      throw new Error('Invalid email or password');
    }
  }

  @Post('error-test')
  errorTest() {
    throw new Error('This is a test error for notification testing');
  }
}

import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  constructor() {}
  @Get()
  getHello() {
    return { message: 'Backend is working!' };
  }

  @Get('create-admin')
  async createAdminUser() {
    const existingUser = await this.userRepository.findOne({
      where: { email: 'admin@coffee.com' },
    });

    if (existingUser) {
      return { message: 'Admin user already exists', user: existingUser };
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = this.userRepository.create({
      email: 'admin@coffee.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(adminUser);

    return {
      message: 'Admin user created successfully',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive,
      },
    };
  }

  @Get('users')
  async getUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
    });
    return { users, count: users.length };
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
          role: 'admin',
        },
      };
    } else {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  @Post('error-test')
  errorTest() {
    throw new BadRequestException('This is a test error for notification testing');
  }
}

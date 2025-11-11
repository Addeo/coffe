import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  HttpException,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('init-admin')
  async initAdmin() {
    try {
      const result = await this.authService.initializeAdmin();
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to initialize admin',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-role')
  async switchRole(@Request() req, @Body('newRole') newRole: string) {
    try {
      const result = await this.authService.switchRole(req.user.id, newRole);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to switch role',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-role')
  async resetRole(@Request() req) {
    try {
      const result = await this.authService.resetRole(req.user.id);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reset role',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
}

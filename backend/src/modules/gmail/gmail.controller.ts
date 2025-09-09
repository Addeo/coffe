import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('gmail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth-url')
  @Roles(UserRole.ADMIN)
  getAuthUrl() {
    const authUrl = this.gmailService.getAuthUrl();
    return { authUrl };
  }

  @Post('auth/callback')
  @Roles(UserRole.ADMIN)
  async handleAuthCallback(@Query('code') code: string) {
    await this.gmailService.handleAuthCallback(code);
    return { message: 'Gmail authentication successful' };
  }

  @Post('check-emails')
  @Roles(UserRole.ADMIN)
  async checkNewEmails() {
    await this.gmailService.checkNewEmails();
    return { message: 'Email check completed' };
  }

  @Get('status')
  @Roles(UserRole.ADMIN)
  getStatus() {
    // Проверяем, настроена ли Gmail интеграция
    const isConfigured = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_ACCESS_TOKEN
    );

    return {
      configured: isConfigured,
      hasAccessToken: !!process.env.GOOGLE_ACCESS_TOKEN,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    };
  }
}

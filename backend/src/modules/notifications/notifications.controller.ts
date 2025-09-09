import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationStatus } from '../../entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req,
    @Query('status') status?: NotificationStatus,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, status, page, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) notificationId: number, @Request() req) {
    const success = await this.notificationsService.markAsRead(notificationId, req.user.id);
    return { success };
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req) {
    const count = await this.notificationsService.markAllAsRead(req.user.id);
    return { markedAsRead: count };
  }

  @Delete(':id')
  async deleteNotification(@Param('id', ParseIntPipe) notificationId: number, @Request() req) {
    const success = await this.notificationsService.deleteNotification(notificationId, req.user.id);
    return { success };
  }
}

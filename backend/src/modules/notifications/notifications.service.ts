import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService
  ) {}

  async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      priority,
      metadata,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Отправляем email для высокоприоритетных уведомлений
    if (priority === NotificationPriority.HIGH || priority === NotificationPriority.URGENT) {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user?.email) {
          await this.sendEmailNotification(savedNotification, user);
          savedNotification.emailSent = true;
          await this.notificationRepository.save(savedNotification);
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    return savedNotification;
  }

  async createOrderStatusNotification(
    orderId: number,
    orderTitle: string,
    newStatus: string,
    affectedUserIds: number[],
    performedById: number
  ): Promise<void> {
    const notifications = affectedUserIds.map(userId =>
      this.createNotification(
        userId,
        NotificationType.ORDER_STATUS_CHANGED,
        `Order status changed: ${orderTitle}`,
        `Order "${orderTitle}" status has been changed to ${newStatus}`,
        NotificationPriority.MEDIUM,
        { orderId, newStatus, performedById }
      )
    );

    await Promise.all(notifications);
  }

  async createOrderAssignedNotification(
    orderId: number,
    orderTitle: string,
    assignedUserId: number,
    performedById: number
  ): Promise<void> {
    await this.createNotification(
      assignedUserId,
      NotificationType.ORDER_ASSIGNED,
      `New order assigned: ${orderTitle}`,
      `You have been assigned to order "${orderTitle}"`,
      NotificationPriority.HIGH,
      { orderId, performedById }
    );
  }

  async createUserStatusNotification(
    userId: number,
    isActive: boolean,
    performedById: number
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    await this.createNotification(
      userId,
      isActive ? NotificationType.USER_ACTIVATED : NotificationType.USER_DEACTIVATED,
      `Account ${isActive ? 'activated' : 'deactivated'}`,
      `Your account has been ${isActive ? 'activated' : 'deactivated'} by administrator`,
      NotificationPriority.HIGH,
      { performedById, isActive }
    );
  }

  async createSystemAlert(
    userIds: number[],
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.URGENT,
    metadata?: any
  ): Promise<void> {
    const notifications = userIds.map(userId =>
      this.createNotification(
        userId,
        NotificationType.SYSTEM_ALERT,
        title,
        message,
        priority,
        metadata
      )
    );

    await Promise.all(notifications);
  }

  async getUserNotifications(
    userId: number,
    status?: NotificationStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[]; total: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId },
      { status: NotificationStatus.READ, updatedAt: new Date() }
    );

    return result.affected > 0;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ, updatedAt: new Date() }
    );

    return result.affected || 0;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });
  }

  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    return result.affected > 0;
  }

  private async sendEmailNotification(notification: Notification, user: User): Promise<void> {
    const userName = `${user.firstName} ${user.lastName}`;

    switch (notification.type) {
      case NotificationType.ORDER_STATUS_CHANGED:
        await this.emailService.sendOrderStatusNotification(
          user.email,
          userName,
          notification.title.replace('Order status changed: ', ''),
          notification.metadata?.newStatus || 'Unknown'
        );
        break;

      case NotificationType.ORDER_ASSIGNED:
        await this.emailService.sendOrderAssignedNotification(
          user.email,
          userName,
          notification.title.replace('New order assigned: ', '')
        );
        break;

      case NotificationType.USER_ACTIVATED:
      case NotificationType.USER_DEACTIVATED:
        await this.emailService.sendUserStatusNotification(
          user.email,
          userName,
          notification.type === NotificationType.USER_ACTIVATED
        );
        break;

      case NotificationType.SYSTEM_ALERT:
        await this.emailService.sendSystemAlert(
          user.email,
          userName,
          notification.title,
          notification.message
        );
        break;
    }
  }
}

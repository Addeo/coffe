import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_CREATED = 'order_created',
  ORDER_CREATED_FROM_EMAIL = 'order_created_from_email',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  SYSTEM_ALERT = 'system_alert',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Дополнительные данные (ID заказа, пользователя и т.д.)

  @Column({ name: 'email_sent', default: false })
  emailSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

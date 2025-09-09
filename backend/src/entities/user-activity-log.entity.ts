import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ActivityType {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DEACTIVATED = 'user_deactivated',
  USER_ACTIVATED = 'user_activated',
  USER_DELETED = 'user_deleted',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_AUTO_ASSIGNED = 'order_auto_assigned',
  ORDER_CREATED = 'order_created',
  ORDER_DELETED = 'order_deleted',
}

@Entity('user_activity_logs')
@Index(['userId', 'createdAt'])
@Index(['activityType', 'createdAt'])
@Index(['performedById'])
export class UserActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Дополнительные данные (старые/новые значения, ID заказов и т.д.)

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedBy: User;

  @Column({ nullable: true })
  performedById: number;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('earnings_statistics')
@Index(['userId', 'month', 'year'])
export class EarningsStatistic {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: number;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ default: 0 })
  completedOrders: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  averageOrderValue: number;

  @Column({ default: 0 })
  totalHours: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

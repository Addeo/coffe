import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { EngineerType } from '../../shared/interfaces/order.interface';

@Entity('engineers')
export class Engineer {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: EngineerType,
  })
  type: EngineerType;

  @Column('decimal', { precision: 10, scale: 2 })
  baseRate: number; // базовая ставка руб/час

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  overtimeRate: number; // ставка за переработку руб/час

  @Column({ default: 160 })
  planHoursMonth: number; // плановые часы в месяц

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  homeTerritoryFixedAmount: number; // фиксированная сумма за домашнюю территорию

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

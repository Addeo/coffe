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
import { Engineer } from './engineer.entity';

/**
 * Баланс инженера - агрегированная информация о начислениях и выплатах
 * Обновляется триггерами или периодически
 */
@Entity('engineer_balances')
@Index(['engineerId'], { unique: true })
export class EngineerBalance {
  @PrimaryGeneratedColumn()
  id: number;

  // Связь с инженером (уникальная)
  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id', unique: true })
  engineerId: number;

  // Итого начислено за все время
  @Column('decimal', { name: 'total_accrued', precision: 12, scale: 2, default: 0 })
  totalAccrued: number;

  // Итого выплачено за все время
  @Column('decimal', { name: 'total_paid', precision: 12, scale: 2, default: 0 })
  totalPaid: number;

  // Текущий баланс (положительный = долг перед инженером, отрицательный = переплата)
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance: number;

  // Последнее начисление
  @Column({ name: 'last_accrual_date', type: 'date', nullable: true })
  lastAccrualDate: Date | null;

  // Последняя выплата
  @Column({ name: 'last_payment_date', type: 'date', nullable: true })
  lastPaymentDate: Date | null;

  // Дата последнего пересчета
  @Column({ name: 'last_calculated_at', type: 'datetime', nullable: true })
  lastCalculatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


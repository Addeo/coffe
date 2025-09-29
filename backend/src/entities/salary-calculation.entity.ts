import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Engineer } from './engineer.entity';
import { User } from './user.entity';

export enum CalculationStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
}

@Entity('salary_calculations')
export class SalaryCalculation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column()
  engineerId: number;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @Column({ default: 160 })
  plannedHours: number;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  actualHours: number; // фактически отработанные часы

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  overtimeHours: number; // часы переработки

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  baseAmount: number; // оплата по базовой ставке

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  overtimeAmount: number; // оплата за переработку

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  bonusAmount: number; // премия

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  carUsageAmount: number; // эксплуатация автомобиля

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  fixedSalary: number; // фиксированная зарплата (оклад)

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  fixedCarAmount: number; // фиксированная оплата за автомобиль

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  additionalEarnings: number; // дополнительный заработок сверх фиксированной зарплаты

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmount: number; // итого к выплате

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  clientRevenue: number; // сумма от заказчиков

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  profitMargin: number; // прибыль (client_revenue - total_amount)

  @Column({
    type: 'enum',
    enum: CalculationStatus,
    default: CalculationStatus.DRAFT,
  })
  status: CalculationStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'calculated_by' })
  calculatedBy: User;

  @Column({ nullable: true })
  calculatedById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

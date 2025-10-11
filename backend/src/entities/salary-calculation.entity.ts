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

  @Column({ name: 'engineer_id' })
  engineerId: number;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @Column({ name: 'planned_hours', default: 160 })
  plannedHours: number;

  @Column('decimal', { name: 'actual_hours', precision: 8, scale: 2, default: 0 })
  actualHours: number; // фактически отработанные часы

  @Column('decimal', { name: 'overtime_hours', precision: 8, scale: 2, default: 0 })
  overtimeHours: number; // часы переработки

  @Column('decimal', { name: 'base_amount', precision: 10, scale: 2, default: 0 })
  baseAmount: number; // оплата по базовой ставке

  @Column('decimal', { name: 'overtime_amount', precision: 10, scale: 2, default: 0 })
  overtimeAmount: number; // оплата за переработку

  @Column('decimal', { name: 'bonus_amount', precision: 10, scale: 2, default: 0 })
  bonusAmount: number; // премия

  @Column('decimal', { name: 'car_usage_amount', precision: 10, scale: 2, default: 0 })
  carUsageAmount: number; // эксплуатация автомобиля

  @Column('decimal', { name: 'fixed_salary', precision: 10, scale: 2, default: 0 })
  fixedSalary: number; // фиксированная зарплата (оклад)

  @Column('decimal', { name: 'fixed_car_amount', precision: 10, scale: 2, default: 0 })
  fixedCarAmount: number; // фиксированная оплата за автомобиль

  @Column('decimal', { name: 'additional_earnings', precision: 10, scale: 2, default: 0 })
  additionalEarnings: number; // дополнительный заработок сверх фиксированной зарплаты

  @Column('decimal', { name: 'total_amount', precision: 10, scale: 2, default: 0 })
  totalAmount: number; // итого к выплате

  @Column('decimal', { name: 'client_revenue', precision: 12, scale: 2, default: 0 })
  clientRevenue: number; // сумма от заказчиков

  @Column('decimal', { name: 'profit_margin', precision: 10, scale: 2, default: 0 })
  profitMargin: number; // прибыль (client_revenue - total_amount)

  @Column({
    type: 'varchar',
    length: 20,
    default: CalculationStatus.DRAFT,
  })
  status: CalculationStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'calculated_by' })
  calculatedBy: User;

  @Column({ name: 'calculated_by', nullable: true })
  calculatedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

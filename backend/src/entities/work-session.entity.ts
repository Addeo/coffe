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
import { Order } from './order.entity';
import { Engineer } from './engineer.entity';

export enum WorkSessionStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('work_sessions')
@Index(['workDate'])
@Index(['engineerId', 'workDate'])
@Index(['orderId'])
export class WorkSession {
  @PrimaryGeneratedColumn()
  id: number;

  // Связь с заказом
  @ManyToOne(() => Order, order => order.workSessions)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: number;

  // Связь с инженером
  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id' })
  engineerId: number;

  // ⭐ Дата работы (для определения месяца оплаты)
  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  // Время работы
  @Column('decimal', { name: 'regular_hours', precision: 5, scale: 2, default: 0 })
  regularHours: number;

  @Column('decimal', { name: 'overtime_hours', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  // Оплата инженеру
  @Column('decimal', { name: 'calculated_amount', precision: 10, scale: 2, default: 0 })
  calculatedAmount: number;

  @Column('decimal', { name: 'car_usage_amount', precision: 10, scale: 2, default: 0 })
  carUsageAmount: number;

  // Ставки (для аудита)
  @Column('decimal', { name: 'engineer_base_rate', precision: 10, scale: 2 })
  engineerBaseRate: number;

  @Column('decimal', {
    name: 'engineer_overtime_coefficient',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 1.6,
  })
  engineerOvertimeCoefficient: number; // коэффициент для сверхурочных (например, 1.6 = 1.6x от базовой ставки)

  // Legacy field - удалить после миграции данных
  @Column('decimal', { name: 'engineer_overtime_rate', precision: 10, scale: 2, nullable: true })
  engineerOvertimeRate?: number;

  // Оплата от организации
  @Column('decimal', { name: 'organization_payment', precision: 10, scale: 2, default: 0 })
  organizationPayment: number;

  @Column('decimal', { name: 'organization_base_rate', precision: 10, scale: 2 })
  organizationBaseRate: number;

  @Column('decimal', {
    name: 'organization_overtime_coefficient',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 1.5,
  })
  organizationOvertimeCoefficient: number; // коэффициент для сверхурочных от организации

  // Legacy field - удалить после миграции данных
  @Column('decimal', {
    name: 'organization_overtime_multiplier',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  organizationOvertimeMultiplier?: number;

  // Разбивка оплат (для отчётности)
  @Column('decimal', { name: 'regular_payment', precision: 10, scale: 2, default: 0 })
  regularPayment: number;

  @Column('decimal', { name: 'overtime_payment', precision: 10, scale: 2, default: 0 })
  overtimePayment: number;

  @Column('decimal', {
    name: 'organization_regular_payment',
    precision: 10,
    scale: 2,
    default: 0,
  })
  organizationRegularPayment: number;

  @Column('decimal', {
    name: 'organization_overtime_payment',
    precision: 10,
    scale: 2,
    default: 0,
  })
  organizationOvertimePayment: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  profit: number;

  // Детали работы
  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  distanceKm: number;

  @Column({ name: 'territory_type', type: 'varchar', length: 20, nullable: true })
  territoryType: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 255, nullable: true })
  photoUrl: string;

  // Статус сессии
  @Column({
    type: 'varchar',
    length: 20,
    default: WorkSessionStatus.COMPLETED,
  })
  status: WorkSessionStatus;

  // Можно ли выставить счёт (для бухгалтерии)
  @Column({ name: 'can_be_invoiced', type: 'boolean', default: true })
  canBeInvoiced: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

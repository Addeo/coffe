import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Engineer } from './engineer.entity';
import { User } from './user.entity';
import { File } from './file.entity';
// Temporarily define OrderSource locally until shared package is fixed
export enum OrderSource {
  MANUAL = 'manual', // создан вручную
  AUTOMATIC = 'automatic', // создан автоматически через интеграцию
  EMAIL = 'email', // создан из email
  API = 'api', // создан через API
}

import { OrderStatus, TerritoryType } from '../shared/interfaces/order.interface';

@Entity('orders')
@Index(['assignedEngineerId', 'status'])
@Index(['createdById', 'status'])
@Index(['status', 'createdAt'])
@Index(['organizationId'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Engineer, { nullable: true })
  @JoinColumn({ name: 'assigned_engineer_id' })
  assignedEngineer: Engineer;

  @Column({ name: 'assigned_engineer_id', nullable: true })
  assignedEngineerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User;

  @Column({ name: 'assigned_by', nullable: true })
  assignedById: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  location: string;

  @Column('decimal', { name: 'distance_km', precision: 8, scale: 2, nullable: true })
  distanceKm: number; // расстояние до объекта

  @Column({
    name: 'territory_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  territoryType: TerritoryType;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.WAITING,
  })
  status: OrderStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderSource.MANUAL,
  })
  source: OrderSource;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date;

  @Column({ name: 'actual_start_date', type: 'datetime', nullable: true })
  actualStartDate: Date;

  @Column({ name: 'completion_date', type: 'datetime', nullable: true })
  completionDate: Date;

  // Work details (previously in WorkReport)
  @Column('decimal', { name: 'regular_hours', precision: 5, scale: 2, nullable: true, default: 0 })
  regularHours: number; // обычные часы работы

  @Column('decimal', { name: 'overtime_hours', precision: 5, scale: 2, nullable: true, default: 0 })
  overtimeHours: number; // часы переработки

  @Column('decimal', {
    name: 'calculated_amount',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  calculatedAmount: number; // рассчитанная оплата инженеру за работу

  @Column('decimal', {
    name: 'car_usage_amount',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  carUsageAmount: number; // доплата за использование машины

  @Column('decimal', {
    name: 'organization_payment',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  organizationPayment: number; // сумма, которую платит организация

  // Детальная разбивка расчётов (для аудита и отчётности)
  @Column('decimal', { name: 'engineer_base_rate', precision: 10, scale: 2, nullable: true })
  engineerBaseRate: number; // базовая ставка инженера (₽/час)

  @Column('decimal', { name: 'engineer_overtime_rate', precision: 10, scale: 2, nullable: true })
  engineerOvertimeRate: number; // ставка переработки инженера (₽/час)

  @Column('decimal', { name: 'organization_base_rate', precision: 10, scale: 2, nullable: true })
  organizationBaseRate: number; // базовая ставка организации (₽/час)

  @Column('decimal', {
    name: 'organization_overtime_multiplier',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  organizationOvertimeMultiplier: number; // коэффициент переработки организации

  @Column('decimal', { name: 'regular_payment', precision: 10, scale: 2, nullable: true })
  regularPayment: number; // оплата за обычные часы (инженеру)

  @Column('decimal', { name: 'overtime_payment', precision: 10, scale: 2, nullable: true })
  overtimePayment: number; // оплата за переработку (инженеру)

  @Column('decimal', {
    name: 'organization_regular_payment',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  organizationRegularPayment: number; // оплата за обычные часы (от организации)

  @Column('decimal', {
    name: 'organization_overtime_payment',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  organizationOvertimePayment: number; // оплата за переработку (от организации)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  profit: number; // прибыль (organizationPayment - calculatedAmount)

  @Column({ name: 'work_notes', type: 'text', nullable: true })
  workNotes: string; // примечания о выполненной работе

  @Column({ name: 'work_photo_url', type: 'varchar', length: 255, nullable: true })
  workPhotoUrl: string; // фото выполненной работы

  @OneToMany(() => File, file => file.order)
  files: File[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

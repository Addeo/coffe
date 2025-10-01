import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Engineer } from './engineer.entity';
import { TerritoryType } from '../../shared/interfaces/order.interface';

export enum WorkResult {
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
}

@Entity('work_reports')
export class WorkReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column()
  engineerId: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column('decimal', { precision: 6, scale: 2 })
  totalHours: number; // с округлением до 0.25

  @Column({ default: false })
  isOvertime: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: WorkResult.COMPLETED,
  })
  workResult: WorkResult;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  distanceKm: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  territoryType: TerritoryType;

  @Column({ nullable: true })
  photoUrl: string; // URL загруженного фото акта

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  calculatedAmount: number; // начисленная сумма инженеру

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  carUsageAmount: number; // сумма за эксплуатацию автомобиля

  @CreateDateColumn()
  submittedAt: Date;
}

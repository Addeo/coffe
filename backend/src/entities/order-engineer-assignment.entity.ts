import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Order } from './order.entity';
import { Engineer } from './engineer.entity';
import { User } from './user.entity';
import { OrderStatus } from '../shared/interfaces/order.interface';

export enum AssignmentStatus {
  PENDING = 'pending', // Ожидает принятия инженером
  ACCEPTED = 'accepted', // Инженер принял заявку
  REJECTED = 'rejected', // Инженер отклонил заявку
  COMPLETED = 'completed', // Заявка выполнена этим инженером
  CANCELLED = 'cancelled', // Назначение отменено
}

/**
 * Entity для множественного назначения инженеров на заявку
 * Позволяет назначать несколько инженеров на одну заявку
 */
@Entity('order_engineer_assignments')
@Unique(['orderId', 'engineerId']) // Один инженер может быть назначен на заявку только один раз
@Index(['orderId', 'status'])
@Index(['engineerId', 'status'])
@Index(['assignedById'])
export class OrderEngineerAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, order => order.engineerAssignments)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id' })
  engineerId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus; // Статус назначения

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User | null;

  @Column({ name: 'assigned_by_id', nullable: true })
  assignedById: number | null; // Кто назначил

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt: Date | null; // Когда инженер принял заявку

  @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
  rejectedAt: Date | null; // Когда инженер отклонил заявку

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null; // Причина отклонения

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean; // Основной инженер (для обратной совместимости)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

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
import { OrderStatus, TerritoryType } from '../../shared/interfaces/order.interface';

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

  @Column()
  organizationId: number;

  @ManyToOne(() => Engineer, { nullable: true })
  @JoinColumn({ name: 'assigned_engineer_id' })
  assignedEngineer: Engineer;

  @Column({ nullable: true })
  assignedEngineerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column()
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User;

  @Column({ nullable: true })
  assignedById: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  location: string;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  distanceKm: number; // расстояние до объекта

  @Column({
    type: 'enum',
    enum: TerritoryType,
    nullable: true,
  })
  territoryType: TerritoryType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.WAITING,
  })
  status: OrderStatus;

  @Column({ type: 'date', nullable: true })
  plannedStartDate: Date;

  @Column({ type: 'datetime', nullable: true })
  actualStartDate: Date;

  @Column({ type: 'datetime', nullable: true })
  completionDate: Date;

  @OneToMany(() => File, file => file.order)
  files: File[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

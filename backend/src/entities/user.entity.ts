import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole; // Legacy field for backward compatibility

  @Column({
    name: 'primary_role',
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
    nullable: true,
  })
  primaryRole?: UserRole; // Highest role assigned to user (falls back to role if not set)

  @Column({
    name: 'active_role',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  activeRole?: UserRole | null; // Currently active role in session (null = use primaryRole or role)

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'has_accepted_agreements', type: 'boolean', default: false })
  hasAcceptedAgreements: boolean; // Принял ли пользователь все обязательные соглашения

  @Column({ name: 'agreements_accepted_at', type: 'datetime', nullable: true })
  agreementsAcceptedAt: Date | null; // Когда были приняты последние обязательные соглашения

  @OneToMany(() => Order, order => order.assignedEngineer)
  assignedOrders: Order[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

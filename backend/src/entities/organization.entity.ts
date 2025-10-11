import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column('decimal', { name: 'base_rate', precision: 10, scale: 2 })
  baseRate: number; // руб/час

  @Column('decimal', { name: 'overtime_multiplier', precision: 3, scale: 1, nullable: true })
  overtimeMultiplier: number; // коэффициент внеурочного времени

  @Column({ name: 'has_overtime', type: 'boolean', default: false })
  hasOvertime: boolean; // предусмотрено ли внеурочное время

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

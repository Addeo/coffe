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

  @Column('decimal', { precision: 10, scale: 2 })
  baseRate: number; // руб/час

  @Column('decimal', { precision: 3, scale: 1, nullable: true })
  overtimeMultiplier: number; // коэффициент внеурочного времени

  @Column({ default: false })
  hasOvertime: boolean; // предусмотрено ли внеурочное время

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

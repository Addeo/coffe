import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Engineer } from './engineer.entity';
import { Organization } from './organization.entity';

@Entity('engineer_organization_rates')
@Unique(['engineerId', 'organizationId'])
export class EngineerOrganizationRate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id' })
  engineerId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  // Индивидуальные ставки для конкретного инженера и организации
  @Column('decimal', { name: 'custom_base_rate', precision: 10, scale: 2, nullable: true })
  customBaseRate?: number; // индивидуальная базовая ставка (руб/час)

  @Column('decimal', { name: 'custom_overtime_rate', precision: 10, scale: 2, nullable: true })
  customOvertimeRate?: number; // индивидуальная ставка переработки (руб/час)

  // Дополнительные настройки для конкретной пары инженер-организация
  @Column('decimal', { name: 'custom_zone1_extra', precision: 10, scale: 2, nullable: true })
  customZone1Extra?: number; // дополнительная оплата за зону 1

  @Column('decimal', { name: 'custom_zone2_extra', precision: 10, scale: 2, nullable: true })
  customZone2Extra?: number; // дополнительная оплата за зону 2

  @Column('decimal', { name: 'custom_zone3_extra', precision: 10, scale: 2, nullable: true })
  customZone3Extra?: number; // дополнительная оплата за зону 3

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

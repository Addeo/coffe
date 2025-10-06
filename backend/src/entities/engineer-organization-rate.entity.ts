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

  @Column()
  engineerId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  organizationId: number;

  // Индивидуальные ставки для конкретного инженера и организации
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customBaseRate?: number; // индивидуальная базовая ставка (руб/час)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customOvertimeRate?: number; // индивидуальная ставка переработки (руб/час)

  @Column('decimal', { precision: 3, scale: 1, nullable: true })
  customOvertimeMultiplier?: number; // индивидуальный коэффициент переработки

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customFixedSalary?: number; // индивидуальная фиксированная зарплата

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customFixedCarAmount?: number; // индивидуальная фиксированная оплата за автомобиль

  // Дополнительные настройки для конкретной пары инженер-организация
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customCarKmRate?: number; // индивидуальная ставка за км (для наемных инженеров)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customZone1Extra?: number; // дополнительная оплата за зону 1

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customZone2Extra?: number; // дополнительная оплата за зону 2

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  customZone3Extra?: number; // дополнительная оплата за зону 3

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

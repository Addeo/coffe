import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum EngineerType {
  STAFF = 'staff',      // штатный
  REMOTE = 'remote',    // удаленный
  CONTRACT = 'contract' // наемный
}

export enum TerritoryType {
  HOME = 'home',        // домашняя территория (≤60 км)
  ZONE_1 = 'zone_1',    // 61-199 км (только для удаленного)
  ZONE_2 = 'zone_2',    // 200-250 км
  ZONE_3 = 'zone_3'     // >250 км
}

@Entity('engineers')
export class Engineer {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: EngineerType,
  })
  type: EngineerType;

  @Column('decimal', { precision: 10, scale: 2 })
  baseRate: number; // базовая ставка руб/час

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  overtimeRate: number; // ставка за переработку руб/час

  @Column({ default: 160 })
  planHoursMonth: number; // плановые часы в месяц

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  homeTerritoryFixedAmount: number; // фиксированная сумма за домашнюю территорию

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

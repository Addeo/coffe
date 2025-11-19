import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AgreementType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  DATA_PROCESSING = 'data_processing',
}

/**
 * Entity для хранения текста соглашений
 * Хранит актуальные версии пользовательских соглашений
 */
@Entity('agreements')
@Index(['type', 'version'])
@Index(['isActive'])
export class Agreement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: AgreementType; // Тип соглашения

  @Column({ type: 'varchar', length: 50 })
  version: string; // Версия соглашения (например, "1.0", "2.0")

  @Column({ type: 'varchar', length: 255 })
  title: string; // Название соглашения

  @Column({ type: 'text' })
  content: string; // HTML или Markdown контент соглашения

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // Активно ли это соглашение

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean; // Обязательно ли для принятия

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: number | null;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null; // Когда было опубликовано

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


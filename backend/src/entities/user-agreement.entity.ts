import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export enum AgreementType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  DATA_PROCESSING = 'data_processing',
}

@Entity('user_agreements')
@Unique(['userId', 'agreementType', 'version'])
@Index(['userId', 'agreementType'])
@Index(['agreementType', 'version'])
export class UserAgreement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    name: 'agreement_type',
    type: 'varchar',
    length: 50,
  })
  agreementType: AgreementType;

  @Column({ type: 'varchar', length: 50 })
  version: string; // Версия соглашения (например, "1.0", "2.0")

  @Column({ name: 'is_accepted', type: 'boolean', default: false })
  isAccepted: boolean; // Принято ли соглашение

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt: Date | null; // Когда было принято

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null; // IP адрес при принятии

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null; // User agent при принятии

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Дополнительные поля для аудита
  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt: Date | null;
}

